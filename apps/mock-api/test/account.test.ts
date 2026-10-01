import { fanIdStatusSchema, fanSchema, sessionSchema, signUpResponseSchema, userSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { DEMO_USER } from "../src/data/store";
import { setup } from "./helpers";

describe("sign up and OTP", () => {
  it("creates an account, sends a code and verifies it", async () => {
    const { api } = setup();
    const signup = await api
      .post("/api/auth/signup")
      .send({ fullName: "Sara Ahmed", phone: "11 1234 5678", email: "", password: "supersecret", acceptTerms: true })
      .expect(201);
    const body = signUpResponseSchema.parse(signup.body);
    expect(body.maskedPhone).toBe("+20 11•• ••• 678");

    const wrong = await api.post("/api/auth/verify").send({ verificationId: body.verificationId, code: "000000" }).expect(400);
    expect(wrong.body.error.code).toBe("INVALID_CODE");

    const verify = await api.post("/api/auth/verify").send({ verificationId: body.verificationId, code: DEMO_USER.otp }).expect(200);
    const session = sessionSchema.parse(verify.body);
    expect(session.user).toMatchObject({ fullName: "Sara Ahmed", initials: "SA", fanId: { status: "none" } });

    // A verification can only be used once.
    await api.post("/api/auth/verify").send({ verificationId: body.verificationId, code: DEMO_USER.otp }).expect(404);
  });

  it("returns field-level validation errors", async () => {
    const { api } = setup();
    const res = await api.post("/api/auth/signup").send({ fullName: "S", phone: "123", password: "x", acceptTerms: false }).expect(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["fullName", "phone", "password", "acceptTerms"]));
  });

  it("refuses duplicate mobile numbers", async () => {
    const { api } = setup();
    const res = await api
      .post("/api/auth/signup")
      .send({ fullName: "Omar Again", phone: DEMO_USER.phone, password: "supersecret", acceptTerms: true })
      .expect(409);
    expect(res.body.error.message).toMatch(/already exists/);
  });

  it("resends codes for known verifications only", async () => {
    const { api } = setup();
    const signup = await api
      .post("/api/auth/signup")
      .send({ fullName: "Sara Ahmed", phone: "1112345678", password: "supersecret", acceptTerms: true });
    await api.post("/api/auth/resend").send({ verificationId: signup.body.verificationId }).expect(200);
    await api.post("/api/auth/resend").send({ verificationId: "ver_missing" }).expect(404);
  });
});

describe("login, me and logout", () => {
  it("logs in the demo fan and returns their profile", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const me = await api.get("/api/me").set(auth(token)).expect(200);
    const user = userSchema.parse(me.body);
    expect(user.fanId.status).toBe("approved");
    expect(user.linkedFans).toHaveLength(4);
    expect(me.body).not.toHaveProperty("password");
  });

  it("rejects wrong credentials without revealing which one", async () => {
    const { api } = setup();
    const res = await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: "wrong-password" }).expect(401);
    expect(res.body.error.message).toBe("Mobile number or password is incorrect");
  });

  it("requires a bearer token", async () => {
    const { api } = setup();
    await api.get("/api/me").expect(401);
    await api.get("/api/me").set("Authorization", "Bearer nope").expect(401);
    await api.get("/api/me").set("Authorization", "Basic abc").expect(401);
  });

  it("invalidates the session on logout", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    await api.post("/api/auth/logout").set(auth(token)).expect(204);
    await api.get("/api/me").set(auth(token)).expect(401);
  });
});

describe("Fan ID", () => {
  it("scans a national ID, then approves the Fan ID", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();

    const missingBack = await api
      .post("/api/fan-id/scan")
      .set(auth(token))
      .send({ documentType: "national_id", frontCaptured: true, backCaptured: false })
      .expect(400);
    expect(missingBack.body.error.details[0].path).toBe("backCaptured");

    const scan = await api
      .post("/api/fan-id/scan")
      .set(auth(token))
      .send({ documentType: "national_id", frontCaptured: true, backCaptured: true })
      .expect(200);
    expect(scan.body.nameEn).toBe("Sara Ahmed");

    await api
      .post("/api/fan-id")
      .set(auth(token))
      .send({ scanId: scan.body.scanId, selfieCaptured: true, confirmDetails: false })
      .expect(400);
    const approved = await api
      .post("/api/fan-id")
      .set(auth(token))
      .send({ scanId: scan.body.scanId, selfieCaptured: true, confirmDetails: true })
      .expect(201);
    expect(fanIdStatusSchema.parse(approved.body)).toMatchObject({ status: "approved", nameEn: "Sara Ahmed" });

    const me = await api.get("/api/me").set(auth(token)).expect(200);
    expect(me.body.linkedFans[0]).toMatchObject({ isSelf: true, status: "approved" });
  });

  it("accepts a passport without a back photo", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    await api
      .post("/api/fan-id/scan")
      .set(auth(token))
      .send({ documentType: "passport", frontCaptured: true, backCaptured: false })
      .expect(200);
  });

  it("rejects someone else's scan", async () => {
    const { api, signUpNewUser, login, auth } = setup();
    const t1 = await login();
    const scan = await api
      .post("/api/fan-id/scan")
      .set(auth(t1))
      .send({ documentType: "passport", frontCaptured: true, backCaptured: false });
    const other = await signUpNewUser();
    await api
      .post("/api/fan-id")
      .set(auth(other))
      .send({ scanId: scan.body.scanId, selfieCaptured: true, confirmDetails: true })
      .expect(404);
  });
});

describe("linked fans", () => {
  it("links a fan pending review", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    // The demo account already has 4 fans: hitting the limit.
    const limit = await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(422);
    expect(limit.body.error.code).toBe("LIMIT_EXCEEDED");
  });

  it("requires your own approved Fan ID and validates the number", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(403);
    const scan = await api
      .post("/api/fan-id/scan")
      .set(auth(token))
      .send({ documentType: "passport", frontCaptured: true, backCaptured: false });
    await api.post("/api/fan-id").set(auth(token)).send({ scanId: scan.body.scanId, selfieCaptured: true, confirmDetails: true });
    await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "123" }).expect(400);
    const res = await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(201);
    expect(fanSchema.parse(res.body)).toMatchObject({ name: "Nour H.", status: "under_review" });
  });
});
