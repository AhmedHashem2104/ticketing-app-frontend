import request from "supertest";
import { createApp } from "../src/app";
import { DEMO_USER, Store } from "../src/data/store";

export const FIXED_NOW = new Date("2026-10-01T10:00:00+03:00");

export function setup(overrides: { now?: Date } = {}) {
  const clock = { now: overrides.now ?? FIXED_NOW };
  const store = new Store(() => clock.now);
  const { app, config } = createApp({
    store,
    config: { env: "test", queueTimeScale: 0.01, holdMinutes: 10, enableTestRoutes: true, corsOrigins: ["http://localhost:3000"] },
  });
  const api = request(app);

  async function login(phone = DEMO_USER.phone, password = DEMO_USER.password) {
    const res = await api.post("/api/auth/login").send({ phone, password }).expect(200);
    return res.body.token as string;
  }

  async function signUpNewUser(phone = "1112345678") {
    const signup = await api
      .post("/api/auth/signup")
      .send({ fullName: "Sara Ahmed", phone, password: "supersecret", acceptTerms: true })
      .expect(201);
    const verify = await api.post("/api/auth/verify").send({ verificationId: signup.body.verificationId, code: DEMO_USER.otp }).expect(200);
    return verify.body.token as string;
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    api,
    store,
    config,
    clock,
    login,
    signUpNewUser,
    auth,
    advance: (ms: number) => (clock.now = new Date(clock.now.getTime() + ms)),
  };
}
