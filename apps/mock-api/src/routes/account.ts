import {
  dayjs,
  fanIdDocumentsSchema,
  fanIdSubmitRequestSchema,
  FAN_ID_MAX_IMAGE_BYTES,
  forgotPasswordRequestSchema,
  initialsOf,
  linkFanRequestSchema,
  loginRequestSchema,
  preferencesRequestSchema,
  resetPasswordRequestSchema,
  signUpRequestSchema,
  verifyOtpRequestSchema,
  type FanIdExtracted,
  type Notification,
  type Session,
  type SignUpResponse,
} from "@repo/contracts";
import { Router, type Request } from "express";
import multer from "multer";
import { z } from "zod";
import type { AppConfig } from "../config";
import { DEMO_USER, type Store, type StoredFan, type StoredUser, type Verification } from "../data/store";
import { addSeconds } from "../data/time";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError, notFound, zodDetails } from "../http/errors";
import { param, parseBody } from "../http/validate";

export const RESEND_SECONDS = 45;
export const MAX_OTP_ATTEMPTS = 5;
export const LOGIN_WINDOW_MINUTES = 15;

const maskPhone = (phone: string) => `+20 ${phone.slice(0, 2)}•• ••• ${phone.slice(-3)}`;
const shortName = (fullName: string) => {
  const [first, last] = fullName.split(/\s+/);
  return last ? `${first} ${last[0]}.` : (first ?? fullName);
};

/** Photos are held in memory only long enough to validate them — nothing is written to disk. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: FAN_ID_MAX_IMAGE_BYTES, files: 2, fields: 10 } });

/** Multer errors (e.g. file too large) become validation errors in the API's error format. */
function runUpload(handler: ReturnType<typeof upload.fields>, req: Request, res: Parameters<typeof handler>[1]) {
  return new Promise<void>((resolve, reject) => {
    handler(req, res, (err?: unknown) => {
      if (!err) return resolve();
      if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE" ? "Photos must be smaller than 8 MB" : "Upload one photo per side";
        return reject(new HttpError("VALIDATION_ERROR", message, [{ path: err.field ?? "file", message }]));
      }
      reject(err);
    });
  });
}

const fileMeta = (req: Request, field: string) => {
  const file = (req.files as Record<string, Express.Multer.File[]> | undefined)?.[field]?.[0];
  return file ? { type: file.mimetype, size: file.size } : undefined;
};

export function accountRouter(store: Store, config: AppConfig) {
  const router = Router();
  const auth = requireAuth(store);

  const createSession = (user: StoredUser): Session => {
    const token = store.token();
    store.sessions.set(token, user.id);
    return { token, user: store.toUser(user) };
  };

  const newVerification = (purpose: Verification["purpose"], userId?: string): Verification => {
    const verification: Verification = { id: store.id("ver"), userId, code: DEMO_USER.otp, createdAt: store.now().getTime(), attempts: 0, purpose };
    store.verifications.set(verification.id, verification);
    return verification;
  };

  /** Five wrong codes and the verification is burned — the fan has to start again. */
  const checkCode = (verificationId: string, code: string, purpose: Verification["purpose"]) => {
    const verification = store.verifications.get(verificationId);
    if (!verification || verification.purpose !== purpose) throw new HttpError("NOT_FOUND", "Verification not found — start again");
    if (verification.attempts >= MAX_OTP_ATTEMPTS) {
      store.verifications.delete(verificationId);
      throw new HttpError("RATE_LIMITED", "Too many wrong codes. Request a new one.");
    }
    if (verification.code !== code) {
      verification.attempts += 1;
      const left = MAX_OTP_ATTEMPTS - verification.attempts;
      throw new HttpError("INVALID_CODE", `That code isn't right. ${left > 0 ? `${left} attempt${left === 1 ? "" : "s"} left.` : "Request a new one."}`);
    }
    store.verifications.delete(verificationId);
    return verification;
  };

  router.post("/auth/signup", (req, res) => {
    const body = parseBody(signUpRequestSchema, req);
    const existing = [...store.users.values()].find((u) => u.phone === body.phone);
    if (existing) throw new HttpError("CONFLICT", "An account with this mobile number already exists. Log in instead.");
    const user: StoredUser = {
      id: store.id("usr"),
      fullName: body.fullName,
      initials: initialsOf(body.fullName),
      phone: body.phone,
      phoneMasked: maskPhone(body.phone),
      ...(body.email ? { email: body.email } : {}),
      password: body.password,
      fanId: { status: "none" },
      fans: [],
      credit: 0,
      preferences: { sms: true, email: Boolean(body.email), marketing: body.marketing },
      usedPromos: [],
    };
    store.users.set(user.id, user);
    const verification = newVerification("signup", user.id);
    const response: SignUpResponse = { verificationId: verification.id, maskedPhone: user.phoneMasked, resendInSeconds: RESEND_SECONDS };
    res.status(201).json(response);
  });

  router.post("/auth/resend", (req, res) => {
    const { verificationId } = parseBody(z.object({ verificationId: z.string().min(1) }), req);
    const verification = store.verifications.get(verificationId);
    if (!verification) throw new HttpError("NOT_FOUND", "Verification not found — start again");
    const wait = Math.ceil((verification.createdAt + RESEND_SECONDS * 1000 - store.now().getTime()) / 1000);
    if (wait > 0) throw new HttpError("RATE_LIMITED", `You can request a new code in ${wait} seconds`);
    verification.createdAt = store.now().getTime();
    verification.attempts = 0;
    res.json({ verificationId, resendInSeconds: RESEND_SECONDS });
  });

  router.post("/auth/verify", (req, res) => {
    const { verificationId, code } = parseBody(verifyOtpRequestSchema, req);
    const verification = checkCode(verificationId, code, "signup");
    const user = verification.userId ? store.users.get(verification.userId) : undefined;
    if (!user) throw notFound("Account");
    res.json(createSession(user));
  });

  router.post("/auth/login", (req, res) => {
    const { phone, password } = parseBody(loginRequestSchema, req);
    const windowStart = dayjs(store.now()).subtract(LOGIN_WINDOW_MINUTES, "minute").valueOf();
    const failures = (store.loginFailures.get(phone) ?? []).filter((at) => at > windowStart);
    if (failures.length >= config.loginAttempts) {
      const retry = Math.ceil((failures[0]! + LOGIN_WINDOW_MINUTES * 60_000 - store.now().getTime()) / 60_000);
      res.setHeader("Retry-After", String(retry * 60));
      throw new HttpError("RATE_LIMITED", `Too many attempts. Try again in ${retry} minute${retry === 1 ? "" : "s"} or reset your password.`);
    }
    const user = [...store.users.values()].find((u) => u.phone === phone);
    if (!user || user.password !== password) {
      store.loginFailures.set(phone, [...failures, store.now().getTime()]);
      throw new HttpError("UNAUTHORIZED", "Mobile number or password is incorrect");
    }
    store.loginFailures.delete(phone);
    res.json(createSession(user));
  });

  router.post("/auth/logout", auth, (_req, res) => {
    store.sessions.delete(res.locals.token as string);
    res.status(204).end();
  });

  /** Always answers the same way so the endpoint can't be used to find out who has an account. */
  router.post("/auth/password/forgot", (req, res) => {
    const { phone } = parseBody(forgotPasswordRequestSchema, req);
    const user = [...store.users.values()].find((u) => u.phone === phone);
    const verification = newVerification("reset", user?.id);
    res.status(202).json({ verificationId: verification.id, maskedPhone: maskPhone(phone), resendInSeconds: RESEND_SECONDS });
  });

  router.post("/auth/password/reset", (req, res) => {
    const body = parseBody(resetPasswordRequestSchema, req);
    const verification = checkCode(body.verificationId, body.code, "reset");
    const user = verification.userId ? store.users.get(verification.userId) : undefined;
    if (!user) throw new HttpError("INVALID_CODE", "That code isn't right. Request a new one.");
    user.password = body.password;
    // Signing out everywhere else is the point of a reset.
    for (const [token, userId] of store.sessions) if (userId === user.id) store.sessions.delete(token);
    store.loginFailures.delete(user.phone);
    res.json(createSession(user));
  });

  /* ---------- Profile ---------- */

  router.get("/me", auth, (_req, res) => {
    res.json(store.toUser(currentUser(res)));
  });

  router.put("/me/preferences", auth, (req, res) => {
    const user = currentUser(res);
    user.preferences = parseBody(preferencesRequestSchema, req);
    res.json(store.toUser(user));
  });

  router.post("/me/fans", auth, (req, res) => {
    const user = store.refreshUser(currentUser(res));
    if (user.fanId.status !== "approved") throw new HttpError("FAN_ID_REQUIRED", "Get your own Fan ID before linking others");
    const body = parseBody(linkFanRequestSchema, req);
    if (user.fans.length >= 4) throw new HttpError("LIMIT_EXCEEDED", "You can link up to 3 fans");
    if (user.fans.some((f) => f.number === body.fanIdNumber)) throw new HttpError("CONFLICT", "This Fan ID is already linked");
    // A Fan ID that's already approved links straight away; unknown numbers go to manual review.
    const approved = store.userByFanNumber(body.fanIdNumber);
    const fan: StoredFan = {
      id: store.id("fan"),
      name: shortName(body.name),
      initials: initialsOf(body.name),
      fanIdMasked: approved ? `Fan ID •••• ${body.fanIdNumber.slice(-4)}` : "Fan ID under review — can’t buy yet",
      status: approved ? "approved" : "under_review",
      isSelf: false,
      ...(approved ? { number: body.fanIdNumber } : {}),
    };
    user.fans.push(fan);
    const { number: _n, ...publicFan } = fan;
    res.status(201).json(publicFan);
  });

  router.delete("/me/fans/:id", auth, (req, res) => {
    const user = currentUser(res);
    const fan = user.fans.find((f) => f.id === param(req, "id"));
    if (!fan) throw notFound("Linked fan");
    if (fan.isSelf) throw new HttpError("FORBIDDEN", "You can't unlink your own Fan ID");
    user.fans = user.fans.filter((f) => f.id !== fan.id);
    res.status(204).end();
  });

  /* ---------- Notifications ---------- */

  const mine = (userId: string) =>
    [...store.notifications.values()].filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  router.get("/me/notifications", auth, (_req, res) => {
    const user = store.refreshUser(currentUser(res));
    const items: Notification[] = mine(user.id).map(({ userId: _u, ...n }) => n);
    res.json({ items, unread: items.filter((n) => !n.read).length });
  });

  router.post("/me/notifications/read", auth, (req, res) => {
    const user = currentUser(res);
    const { ids } = parseBody(z.object({ ids: z.array(z.string().min(1)).max(100).optional() }), req);
    for (const n of mine(user.id)) if (!ids || ids.includes(n.id)) n.read = true;
    res.status(204).end();
  });

  /* ---------- Fan ID (multipart uploads, reviewed asynchronously) ---------- */

  const documentsUpload = upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
  ]);
  router.post("/fan-id/documents", auth, async (req, res) => {
    await runUpload(documentsUpload, req, res);
    const user = currentUser(res);
    const parsed = fanIdDocumentsSchema.safeParse({ documentType: req.body?.documentType, front: fileMeta(req, "front"), back: fileMeta(req, "back") });
    if (!parsed.success) throw new HttpError("VALIDATION_ERROR", "Check your photos", zodDetails(parsed.error));
    const scanId = store.id("scan");
    store.scans.set(scanId, { userId: user.id, documentType: parsed.data.documentType, nameEn: user.fullName });
    const extracted: FanIdExtracted = {
      scanId,
      nameEn: user.fullName,
      nameAr: user.fullName === "Omar Khaled" ? "عمر خالد" : "الاسم كما في الوثيقة",
      idNumberMasked: parsed.data.documentType === "passport" ? "A •••• •• 21" : "2 98 •••• •••• 21",
      dateOfBirth: "14 / 03 / 1998",
    };
    res.json(extracted);
  });

  const selfieUpload = upload.fields([{ name: "selfie", maxCount: 1 }]);
  router.post("/fan-id", auth, async (req, res) => {
    await runUpload(selfieUpload, req, res);
    const user = currentUser(res);
    const parsed = fanIdSubmitRequestSchema.safeParse({
      scanId: req.body?.scanId,
      confirmDetails: req.body?.confirmDetails === "true" || req.body?.confirmDetails === true,
      selfie: fileMeta(req, "selfie"),
    });
    if (!parsed.success) throw new HttpError("VALIDATION_ERROR", "Check your details", zodDetails(parsed.error));
    const scan = store.scans.get(parsed.data.scanId);
    if (!scan || scan.userId !== user.id) throw new HttpError("NOT_FOUND", "Scan not found — photograph your document again");
    if (user.fanId.status === "approved") throw new HttpError("CONFLICT", "You already have an approved Fan ID");
    store.scans.delete(parsed.data.scanId);
    user.fanId = { status: "pending", submittedAt: store.now().toISOString() };
    user.fanIdReviewAt = addSeconds(store.now(), config.fanIdReviewSeconds).getTime();
    res.status(202).json(user.fanId);
  });

  return router;
}
