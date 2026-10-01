import { fanIdStatusSchema, fanSchema, notificationSchema, sessionSchema, signUpResponseSchema, userSchema } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { DEMO_USER, SECOND_USER } from "../src/data/store";
import { MAX_OTP_ATTEMPTS, RESEND_SECONDS } from "../src/routes/account";
import { setup } from "./helpers";

const JPEG = { contentType: "image/jpeg", filename: "photo.jpg" };
const photo = (bytes = 2048) => Buffer.alloc(bytes, 1);

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
    expect(wrong.body.error).toMatchObject({ code: "INVALID_CODE", message: expect.stringMatching(/4 attempts left/) });

    const verify = await api.post("/api/auth/verify").send({ verificationId: body.verificationId, code: DEMO_USER.otp }).expect(200);
    const session = sessionSchema.parse(verify.body);
    expect(session.user).toMatchObject({ fullName: "Sara Ahmed", initials: "SA", fanId: { status: "none" } });

    // A verification can only be used once.
    await api.post("/api/auth/verify").send({ verificationId: body.verificationId, code: DEMO_USER.otp }).expect(404);
  });

  it("burns the code after too many wrong attempts", async () => {
    const { api } = setup();
    const signup = await api.post("/api/auth/signup").send({ fullName: "Sara Ahmed", phone: "1112345678", password: "supersecret", acceptTerms: true });
    const { verificationId } = signup.body;
    for (let i = 0; i < MAX_OTP_ATTEMPTS; i += 1) await api.post("/api/auth/verify").send({ verificationId, code: "000000" }).expect(400);
    const locked = await api.post("/api/auth/verify").send({ verificationId, code: DEMO_USER.otp }).expect(429);
    expect(locked.body.error.code).toBe("RATE_LIMITED");
    await api.post("/api/auth/verify").send({ verificationId, code: DEMO_USER.otp }).expect(404);
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

  it("only resends a code after the cooldown", async () => {
    const { api, advance } = setup();
    const signup = await api.post("/api/auth/signup").send({ fullName: "Sara Ahmed", phone: "1112345678", password: "supersecret", acceptTerms: true });
    const early = await api.post("/api/auth/resend").send({ verificationId: signup.body.verificationId }).expect(429);
    expect(early.body.error.message).toMatch(/45 seconds/);
    advance(RESEND_SECONDS * 1000);
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
    expect(user.preferences).toEqual({ sms: true, email: true, marketing: false });
    expect(me.body).not.toHaveProperty("password");
    expect(JSON.stringify(me.body)).not.toMatch(/221044174821/);
  });

  it("rejects wrong credentials without revealing which one", async () => {
    const { api } = setup();
    const res = await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: "wrong-password" }).expect(401);
    expect(res.body.error.message).toBe("Mobile number or password is incorrect");
  });

  it("rate-limits repeated failed logins per number", async () => {
    const { api, advance, config } = setup();
    for (let i = 0; i < config.loginAttempts; i += 1) {
      await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: "wrong-password" }).expect(401);
    }
    const limited = await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: DEMO_USER.password }).expect(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toBe("900");
    // Other numbers are unaffected.
    await api.post("/api/auth/login").send({ phone: SECOND_USER.phone, password: SECOND_USER.password }).expect(200);
    advance(15 * 60_000 + 1);
    await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: DEMO_USER.password }).expect(200);
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

describe("password reset", () => {
  it("resets the password with an SMS code and signs out other sessions", async () => {
    const { api, login, auth } = setup();
    const oldToken = await login();
    const forgot = await api.post("/api/auth/password/forgot").send({ phone: DEMO_USER.phone }).expect(202);
    expect(forgot.body.maskedPhone).toBe("+20 10•• ••• 482");

    const mismatch = await api
      .post("/api/auth/password/reset")
      .send({ verificationId: forgot.body.verificationId, code: DEMO_USER.otp, password: "brandnewpass", confirmPassword: "different" })
      .expect(400);
    expect(mismatch.body.error.details[0].path).toBe("confirmPassword");

    const reset = await api
      .post("/api/auth/password/reset")
      .send({ verificationId: forgot.body.verificationId, code: DEMO_USER.otp, password: "brandnewpass", confirmPassword: "brandnewpass" })
      .expect(200);
    expect(sessionSchema.parse(reset.body).user.fullName).toBe("Omar Khaled");
    await api.get("/api/me").set(auth(oldToken)).expect(401);
    await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: DEMO_USER.password }).expect(401);
    await api.post("/api/auth/login").send({ phone: DEMO_USER.phone, password: "brandnewpass" }).expect(200);
  });

  it("answers the same for unknown numbers but never resets anything", async () => {
    const { api } = setup();
    const forgot = await api.post("/api/auth/password/forgot").send({ phone: "1199999999" }).expect(202);
    expect(forgot.body).toMatchObject({ verificationId: expect.any(String), resendInSeconds: RESEND_SECONDS });
    const res = await api
      .post("/api/auth/password/reset")
      .send({ verificationId: forgot.body.verificationId, code: DEMO_USER.otp, password: "brandnewpass", confirmPassword: "brandnewpass" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_CODE");
  });

  it("won't accept a sign-up code for a reset", async () => {
    const { api } = setup();
    const signup = await api.post("/api/auth/signup").send({ fullName: "Sara Ahmed", phone: "1112345678", password: "supersecret", acceptTerms: true });
    await api
      .post("/api/auth/password/reset")
      .send({ verificationId: signup.body.verificationId, code: DEMO_USER.otp, password: "brandnewpass", confirmPassword: "brandnewpass" })
      .expect(404);
  });
});

describe("preferences and notifications", () => {
  it("updates notification preferences", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const res = await api.put("/api/me/preferences").set(auth(token)).send({ sms: false, email: true, marketing: true }).expect(200);
    expect(res.body.preferences).toEqual({ sms: false, email: true, marketing: true });
    await api.put("/api/me/preferences").set(auth(token)).send({ sms: "yes" }).expect(400);
  });

  it("lists notifications and marks them read", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    const list = await api.get("/api/me/notifications").set(auth(token)).expect(200);
    expect(list.body.unread).toBe(1);
    const [first] = list.body.items.map((n: unknown) => notificationSchema.parse(n));
    expect(first).toMatchObject({ kind: "event", read: false });
    await api.post("/api/me/notifications/read").set(auth(token)).send({}).expect(204);
    const after = await api.get("/api/me/notifications").set(auth(token)).expect(200);
    expect(after.body.unread).toBe(0);
  });
});

describe("Fan ID", () => {
  it("uploads document photos and a selfie, then is approved after review", async () => {
    const { api, signUpNewUser, auth, advance, config } = setup();
    const token = await signUpNewUser();

    const missingBack = await api.post("/api/fan-id/documents").set(auth(token)).field("documentType", "national_id").attach("front", photo(), JPEG).expect(400);
    expect(missingBack.body.error.details).toEqual([{ path: "back", message: "Add a photo of the back" }]);

    const scan = await api
      .post("/api/fan-id/documents")
      .set(auth(token))
      .field("documentType", "national_id")
      .attach("front", photo(), JPEG)
      .attach("back", photo(), JPEG)
      .expect(200);
    expect(scan.body.nameEn).toBe("Sara Ahmed");

    const noSelfie = await api.post("/api/fan-id").set(auth(token)).field("scanId", scan.body.scanId).field("confirmDetails", "true").expect(400);
    expect(noSelfie.body.error.details[0].message).toBe("Take a selfie to continue");

    const pending = await api
      .post("/api/fan-id")
      .set(auth(token))
      .field("scanId", scan.body.scanId)
      .field("confirmDetails", "true")
      .attach("selfie", photo(), JPEG)
      .expect(202);
    expect(fanIdStatusSchema.parse(pending.body)).toMatchObject({ status: "pending" });
    expect((await api.get("/api/me").set(auth(token))).body.fanId.status).toBe("pending");

    advance(config.fanIdReviewSeconds * 1000);
    const me = await api.get("/api/me").set(auth(token)).expect(200);
    expect(me.body.fanId).toMatchObject({ status: "approved", nameEn: "Sara Ahmed", number: expect.stringMatching(/^2210 4417 \d{4}$/) });
    expect(me.body.linkedFans[0]).toMatchObject({ isSelf: true, status: "approved", name: "Sara A. (you)" });
    const notes = await api.get("/api/me/notifications").set(auth(token));
    expect(notes.body.items[0]).toMatchObject({ kind: "fan_id", title: "Your Fan ID is approved" });
  });

  it("accepts a passport without a back photo", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    await api.post("/api/fan-id/documents").set(auth(token)).field("documentType", "passport").attach("front", photo(), JPEG).expect(200);
  });

  it("rejects files that aren't photos or are too large", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    const pdf = await api
      .post("/api/fan-id/documents")
      .set(auth(token))
      .field("documentType", "passport")
      .attach("front", photo(), { contentType: "application/pdf", filename: "scan.pdf" })
      .expect(400);
    expect(pdf.body.error.details[0].message).toBe("Use a JPG, PNG, WEBP or HEIC photo");
    const huge = await api
      .post("/api/fan-id/documents")
      .set(auth(token))
      .field("documentType", "passport")
      .attach("front", photo(8 * 1024 * 1024 + 1), JPEG)
      .expect(400);
    expect(huge.body.error.message).toBe("Photos must be smaller than 8 MB");
  });

  it("rejects someone else's scan", async () => {
    const { api, signUpNewUser, auth } = setup();
    const t1 = await signUpNewUser("1112345678");
    const scan = await api.post("/api/fan-id/documents").set(auth(t1)).field("documentType", "passport").attach("front", photo(), JPEG);
    const other = await signUpNewUser("1112345679");
    await api.post("/api/fan-id").set(auth(other)).field("scanId", scan.body.scanId).field("confirmDetails", "true").attach("selfie", photo(), JPEG).expect(404);
  });
});

describe("linked fans", () => {
  it("enforces the linked fan limit", async () => {
    const { api, login, auth } = setup();
    const token = await login();
    // The demo account already has 4 fans.
    const limit = await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(422);
    expect(limit.body.error.code).toBe("LIMIT_EXCEEDED");
  });

  it("links known Fan IDs straight away and unknown ones for review, and unlinks", async () => {
    const { api, login, auth } = setup();
    const token = await login(SECOND_USER.phone, SECOND_USER.password);
    await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "123" }).expect(400);
    const known = await api.post("/api/me/fans").set(auth(token)).send({ name: "Omar Khaled", fanIdNumber: "2210 4417 4821" }).expect(201);
    expect(fanSchema.parse(known.body)).toMatchObject({ name: "Omar K.", status: "approved", fanIdMasked: "Fan ID •••• 4821" });
    await api.post("/api/me/fans").set(auth(token)).send({ name: "Omar Khaled", fanIdNumber: "2210 4417 4821" }).expect(409);
    const unknown = await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(201);
    expect(unknown.body.status).toBe("under_review");

    await api.delete(`/api/me/fans/${unknown.body.id}`).set(auth(token)).expect(204);
    const me = await api.get("/api/me").set(auth(token));
    expect(me.body.linkedFans.map((f: { name: string }) => f.name)).toEqual(["Youssef A. (you)", "Omar K."]);
    await api.delete(`/api/me/fans/${me.body.linkedFans[0].id}`).set(auth(token)).expect(403);
  });

  it("requires your own approved Fan ID first", async () => {
    const { api, signUpNewUser, auth } = setup();
    const token = await signUpNewUser();
    await api.post("/api/me/fans").set(auth(token)).send({ name: "Nour Hassan", fanIdNumber: "2210 4417 0001" }).expect(403);
  });
});
