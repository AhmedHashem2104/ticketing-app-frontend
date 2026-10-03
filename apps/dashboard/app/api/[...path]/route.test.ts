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

describe("dashboard API proxy", () => {
  it("forwards staff calls with the token from the cookie only", async () => {
    vi.stubEnv("API_ORIGIN", "http://api.test");
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost:3001/api/staff/fan-ids/usr_1/approve", {
        method: "POST",
        headers: {
          authorization: "Bearer forged",
          cookie: "mp_staff=tok123",
          "accept-language": "ar",
          origin: "http://localhost:3001",
          host: "localhost:3001",
        },
        body: "{}",
      }),
      ctx(["staff", "fan-ids", "usr_1", "approve"]),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/staff/fan-ids/usr_1/approve");
    expect((init.headers as Headers).get("authorization")).toBe("Bearer tok123");
    expect((init.headers as Headers).get("accept-language")).toBe("ar");
  });

  it("refuses anything that isn't a staff endpoint", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://localhost:3001/api/me", { headers: { cookie: "mp_staff=tok" } }), ctx(["me"]));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the sign-in token in a strict httpOnly cookie and returns only the staff member", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ token: "secret-token-1234567", staff: { id: "stf_1" } })),
    );
    const response = await POST(
      new NextRequest("https://ops.matchpass.app/api/staff/auth/login", { method: "POST", body: "{}" }),
      ctx(["staff", "auth", "login"]),
    );
    expect(await response.json()).toEqual({ staff: { id: "stf_1" } });
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^mp_staff=secret-token-1234567;/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
  });

  it("clears the cookie on sign-out and when the API no longer knows the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const out = await POST(
      new NextRequest("http://localhost:3001/api/staff/auth/logout", { method: "POST", headers: { cookie: "mp_staff=tok" } }),
      ctx(["staff", "auth", "logout"]),
    );
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toMatch(/mp_staff=;.*Max-Age=0/);
    const stale = await GET(
      new NextRequest("http://localhost:3001/api/staff/me", { headers: { cookie: "mp_staff=old" } }),
      ctx(["staff", "me"]),
    );
    expect(stale.status).toBe(401);
    expect(stale.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("blocks cross-site writes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(
      new NextRequest("http://localhost:3001/api/staff/fans/usr_1/suspend", {
        method: "POST",
        headers: { origin: "https://evil.example", host: "localhost:3001", cookie: "mp_staff=tok" },
      }),
      ctx(["staff", "fans", "usr_1", "suspend"]),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
