import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("API proxy route", () => {
  it("forwards method, path, query, auth and body to API_ORIGIN", async () => {
    vi.stubEnv("API_ORIGIN", "http://api.test/");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), { status: 201, headers: { "content-type": "application/json", "set-cookie": "x=1" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest("http://localhost:3000/api/holds?x=1", {
      method: "POST",
      headers: { authorization: "Bearer t", "content-type": "application/json", cookie: "secret=1" },
      body: JSON.stringify({ a: 1 }),
    });
    const response = await POST(request, ctx(["holds"]));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toBeNull();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/holds?x=1");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer t");
    expect(headers.get("cookie")).toBeNull();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a":1}');
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
