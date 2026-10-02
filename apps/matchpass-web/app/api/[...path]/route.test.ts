import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init, headers: { "content-type": "application/json", ...init.headers } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("API proxy route", () => {
  it("forwards method, path, query and body, and takes auth from the session cookie only", async () => {
    vi.stubEnv("API_ORIGIN", "http://api.test/");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }, { status: 201, headers: { "set-cookie": "x=1" } }));
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost:3000/api/holds?x=1", {
      method: "POST",
      headers: {
        authorization: "Bearer forged",
        "content-type": "application/json",
        cookie: "mp_session=tok123; other=1",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
      body: JSON.stringify({ a: 1 }),
    });
    const response = await POST(request, ctx(["holds"]));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/holds?x=1");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer tok123");
    expect(headers.get("cookie")).toBeNull();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a":1}');
  });

  it("moves the token from login responses into an httpOnly cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ token: "secret-token-1234567", user: { id: "usr_1" } })),
    );
    const response = await POST(
      new NextRequest("https://matchpass.app/api/auth/login", { method: "POST", body: "{}" }),
      ctx(["auth", "login"]),
    );
    expect(await response.json()).toEqual({ user: { id: "usr_1" } });
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("mp_session=secret-token-1234567");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });

  it("clears the cookie on logout and when the API rejects the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { code: "UNAUTHORIZED", message: "x" } }, { status: 401 })),
    );
    const logout = await POST(
      new NextRequest("http://localhost:3000/api/auth/logout", { method: "POST", headers: { cookie: "mp_session=old" } }),
      ctx(["auth", "logout"]),
    );
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    const me = await GET(new NextRequest("http://localhost:3000/api/me", { headers: { cookie: "mp_session=old" } }), ctx(["me"]));
    expect(me.status).toBe(401);
    expect(me.headers.get("set-cookie")).toContain("mp_session=;");
  });

  it("refuses cross-site state changes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const evil = await POST(
      new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { origin: "https://evil.test", host: "localhost:3000", cookie: "mp_session=t" },
      }),
      ctx(["orders"]),
    );
    expect(evil.status).toBe(403);
    const fetchSite = await POST(
      new NextRequest("http://localhost:3000/api/orders", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }),
      ctx(["orders"]),
    );
    expect(fetchSite.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes payment redirects through untouched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 303, headers: { location: "/orders/ord_1" } })),
    );
    const response = await POST(
      new NextRequest("http://localhost:3000/api/payments/abc", {
        method: "POST",
        headers: { origin: "http://localhost:3000", host: "localhost:3000" },
      }),
      ctx(["payments", "abc"]),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/orders/ord_1");
  });

  it("encodes path segments and returns 502 when the API is down", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost:3000/api/x"), ctx(["events", "a b"]));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://localhost:4000/api/events/a%20b");
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
