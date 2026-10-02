import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:3001"), { headers });
const signedIn = { cookie: "mp_staff=tok" };

describe("dashboard proxy", () => {
  it("sends unprefixed pages to the remembered or browser language", () => {
    expect(proxy(request("/fan-ids", { "accept-language": "ar-EG,ar" })).headers.get("location")).toBe("http://localhost:3001/ar/fan-ids");
    expect(proxy(request("/", { cookie: "mp_locale=en", "accept-language": "ar" })).headers.get("location")).toBe(
      "http://localhost:3001/en",
    );
  });

  it("sends visitors without a staff session to sign in, and back afterwards", () => {
    const res = proxy(request("/ar/refunds?status=all"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`http://localhost:3001/ar/login?next=${encodeURIComponent("/ar/refunds?status=all")}`);
    expect(proxy(request("/en")).headers.get("location")).toBe("http://localhost:3001/en/login");
  });

  it("serves the sign-in page and signed-in pages with a CSP", () => {
    for (const res of [proxy(request("/en/login")), proxy(request("/ar/events", signedIn))]) {
      expect(res.status).toBe(200);
      expect(res.headers.get("content-security-policy")).toContain("script-src 'self' 'nonce-");
    }
  });

  it("never touches API and image paths", () => {
    for (const path of ["/api/staff/me", "/images/events/x.jpg"]) expect(proxy(request(path)).status).toBe(200);
  });
});
