import { describe, expect, it, vi } from "vitest";
import { POST as monitoring } from "@/app/monitoring/route";
import { buildCsp, createNonce } from "./csp";
import { clearedSessionCookie, isCrossSite, isSecureRequest, sessionCookie } from "./session-cookie";

describe("content security policy", () => {
  it("allows only nonce'd scripts in production", () => {
    const csp = buildCsp("abc123", { dev: false, reportUri: "/monitoring/csp" });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("report-uri /monitoring/csp");
  });

  it("only upgrades insecure requests when the page itself is served over HTTPS", () => {
    expect(buildCsp("n", { dev: false, secure: false })).not.toContain("upgrade-insecure-requests");
  });

  it("relaxes only what the dev server needs", () => {
    const csp = buildCsp("n", { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("creates unpredictable nonces", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe("session cookie and CSRF helpers", () => {
  it("builds httpOnly, SameSite cookies that are Secure on HTTPS", () => {
    expect(sessionCookie("tok", { secure: false })).toBe("mp_session=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000");
    expect(sessionCookie("tok", { secure: true })).toMatch(/; Secure$/);
    expect(clearedSessionCookie({ secure: false })).toContain("Max-Age=0");
    expect(isSecureRequest(new URL("http://x.test"), "https, http")).toBe(true);
    expect(isSecureRequest(new URL("http://x.test"), null)).toBe(false);
  });

  it("flags cross-site requests from Origin or Sec-Fetch-Site", () => {
    expect(isCrossSite(new Headers({ origin: "https://matchpass.app" }), "matchpass.app")).toBe(false);
    expect(isCrossSite(new Headers({ origin: "https://evil.test" }), "matchpass.app")).toBe(true);
    expect(isCrossSite(new Headers({ origin: "null" }), "matchpass.app")).toBe(true);
    expect(isCrossSite(new Headers({ "sec-fetch-site": "same-site" }), "matchpass.app")).toBe(true);
    expect(isCrossSite(new Headers({ "sec-fetch-site": "same-origin" }), "matchpass.app")).toBe(false);
    // Non-browser clients (no Origin, no Sec-Fetch-Site) can't carry a victim's cookies.
    expect(isCrossSite(new Headers(), "matchpass.app")).toBe(false);
  });
});

describe("monitoring endpoint", () => {
  const post = (body: unknown) =>
    monitoring(
      new Request("http://localhost/monitoring", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }),
    );

  it("logs web vitals and client errors as structured lines", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ type: "web-vital", name: "LCP", value: 1234, rating: "good", id: "v1", path: "/" })).status).toBe(204);
    expect(JSON.parse(log.mock.calls[0]![0] as string)).toMatchObject({
      kind: "web-vital",
      name: "LCP",
      value: 1234,
      service: "matchpass-web",
    });
    expect((await post({ type: "client-error", message: "boom", path: "/tickets" })).status).toBe(204);
    expect(JSON.parse(error.mock.calls[0]![0] as string)).toMatchObject({ level: "error", kind: "client-error", message: "boom" });
    log.mockRestore();
    error.mockRestore();
  });

  it("rejects malformed or oversized payloads", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ type: "web-vital", name: "XYZ", value: 1, id: "x", path: "/" })).status).toBe(400);
    expect((await post("x".repeat(10_001))).status).toBe(413);
  });
});
