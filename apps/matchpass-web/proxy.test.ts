import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:3000"), { headers });

describe("proxy: language routing", () => {
  it("sends unprefixed pages to the browser's language", () => {
    const res = proxy(request("/events?tab=cinema", { "accept-language": "ar-EG,ar;q=0.9,en;q=0.5" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/ar/events?tab=cinema");
  });

  it("defaults to English and prefers the remembered language over the browser", () => {
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost:3000/en");
    const remembered = proxy(request("/tickets", { "accept-language": "ar", cookie: "mp_locale=en" }));
    expect(remembered.headers.get("location")).toBe("http://localhost:3000/en/tickets");
  });

  it("serves prefixed pages with a CSP and remembers the language", () => {
    const res = proxy(request("/ar/tickets"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain("script-src");
    expect(res.headers.get("set-cookie")).toMatch(/mp_locale=ar/);
  });

  it("never redirects API, static or image paths", () => {
    for (const path of ["/api/home", "/images/events/x.jpg", "/monitoring"]) expect(proxy(request(path)).status).toBe(200);
  });
});
