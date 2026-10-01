import { apiErrorSchema } from "@repo/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { setup } from "./helpers";

describe("platform", () => {
  it("reports health", async () => {
    const { api } = setup();
    const res = await api.get("/api/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });

  it("returns a typed 404 for unknown routes", async () => {
    const { api } = setup();
    const res = await api.get("/api/nope").expect(404);
    expect(apiErrorSchema.parse(res.body).error.code).toBe("NOT_FOUND");
  });

  it("rejects malformed JSON with a validation error", async () => {
    const { api } = setup();
    const res = await api.post("/api/auth/login").set("Content-Type", "application/json").send("{bad json").expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("sets security headers and hides the framework", async () => {
    const { api } = setup();
    const res = await api.get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("allows configured CORS origins only", async () => {
    const { api } = setup();
    const allowed = await api.get("/api/health").set("Origin", "http://localhost:3000");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    const blocked = await api.get("/api/health").set("Origin", "http://evil.test");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("resets state through the test route", async () => {
    const { api, store, login, auth } = setup();
    const token = await login();
    expect(store.sessions.size).toBe(1);
    const res = await api.post("/api/__test__/reset").expect(200);
    expect(res.body.reset).toBe(true);
    expect(store.sessions.size).toBe(0);
    await api.get("/api/me").set(auth(token)).expect(401);
  });

  it("reports readiness and tags every response with a request id", async () => {
    const { api } = setup();
    const ready = await api.get("/api/ready").expect(200);
    expect(ready.body).toEqual({ ready: true });
    expect(ready.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    const echoed = await api.get("/api/health").set("X-Request-Id", "trace-12345678");
    expect(echoed.headers["x-request-id"]).toBe("trace-12345678");
    const unsafe = await api.get("/api/health").set("X-Request-Id", "<script>");
    expect(unsafe.headers["x-request-id"]).not.toBe("<script>");
  });

  it("hides the test route when disabled", async () => {
    const { app } = createApp({ config: { enableTestRoutes: false } });
    await request(app).post("/api/__test__/reset").expect(404);
  });
});

describe("loadConfig", () => {
  it("applies defaults", () => {
    expect(loadConfig({})).toMatchObject({ env: "development", port: 4000, holdMinutes: 10, enableTestRoutes: true });
  });

  it("disables test routes in production unless explicitly enabled", () => {
    const secret = "a-production-secret-value";
    expect(loadConfig({ NODE_ENV: "production", QR_SECRET: secret }).enableTestRoutes).toBe(false);
    expect(loadConfig({ NODE_ENV: "production", QR_SECRET: secret, ENABLE_TEST_ROUTES: "true" }).enableTestRoutes).toBe(true);
  });

  it("requires a QR signing secret in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/QR_SECRET/);
  });

  it("parses CORS origins and rejects invalid values", () => {
    expect(loadConfig({ CORS_ORIGIN: "http://a.test, http://b.test" }).corsOrigins).toEqual(["http://a.test", "http://b.test"]);
    expect(() => loadConfig({ PORT: "not-a-port" })).toThrow(/PORT/);
  });
});
