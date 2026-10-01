import {
  fanIdScanRequestSchema,
  fanIdSubmitRequestSchema,
  initialsOf,
  linkFanRequestSchema,
  loginRequestSchema,
  signUpRequestSchema,
  verifyOtpRequestSchema,
  type FanIdExtracted,
  type Session,
  type SignUpResponse,
} from "@repo/contracts";
import { Router } from "express";
import { z } from "zod";
import { DEMO_USER, type Store, type StoredUser } from "../data/store";
import { currentUser, requireAuth } from "../http/auth";
import { HttpError } from "../http/errors";
import { parseBody } from "../http/validate";

const maskPhone = (phone: string) => `+20 ${phone.slice(0, 2)}•• ••• ${phone.slice(-3)}`;
const shortName = (fullName: string) => {
  const [first, last] = fullName.split(/\s+/);
  return last ? `${first} ${last[0]}.` : (first ?? fullName);
};

export function accountRouter(store: Store) {
  const router = Router();
  const auth = requireAuth(store);

  const createSession = (user: StoredUser): Session => {
    const token = store.token();
    store.sessions.set(token, user.id);
    return { token, user: store.toUser(user) };
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
    };
    store.users.set(user.id, user);
    const verification = { id: store.id("ver"), userId: user.id, code: DEMO_USER.otp, createdAt: Date.now() };
    store.verifications.set(verification.id, verification);
    const response: SignUpResponse = { verificationId: verification.id, maskedPhone: user.phoneMasked, resendInSeconds: 45 };
    res.status(201).json(response);
  });

  router.post("/auth/resend", (req, res) => {
    const { verificationId } = parseBody(z.object({ verificationId: z.string().min(1) }), req);
    const verification = store.verifications.get(verificationId);
    if (!verification) throw new HttpError("NOT_FOUND", "Verification not found — start again");
    verification.createdAt = Date.now();
    res.json({ verificationId, resendInSeconds: 45 });
  });

  router.post("/auth/verify", (req, res) => {
    const { verificationId, code } = parseBody(verifyOtpRequestSchema, req);
    const verification = store.verifications.get(verificationId);
    if (!verification) throw new HttpError("NOT_FOUND", "Verification not found — start again");
    if (verification.code !== code) throw new HttpError("INVALID_CODE", "That code isn't right. Check the SMS and try again.");
    store.verifications.delete(verificationId);
    const user = store.users.get(verification.userId)!;
    res.json(createSession(user));
  });

  router.post("/auth/login", (req, res) => {
    const { phone, password } = parseBody(loginRequestSchema, req);
    const user = [...store.users.values()].find((u) => u.phone === phone);
    if (!user || user.password !== password) throw new HttpError("UNAUTHORIZED", "Mobile number or password is incorrect");
    res.json(createSession(user));
  });

  router.post("/auth/logout", auth, (_req, res) => {
    store.sessions.delete(res.locals.token as string);
    res.status(204).end();
  });

  router.get("/me", auth, (_req, res) => {
    res.json(store.toUser(currentUser(res)));
  });

  router.post("/me/fans", auth, (req, res) => {
    const user = currentUser(res);
    if (user.fanId.status !== "approved") throw new HttpError("FAN_ID_REQUIRED", "Get your own Fan ID before linking others");
    const body = parseBody(linkFanRequestSchema, req);
    if (user.fans.length >= 4) throw new HttpError("LIMIT_EXCEEDED", "You can link up to 3 fans");
    const fan = {
      id: store.id("fan"),
      name: shortName(body.name),
      initials: initialsOf(body.name),
      fanIdMasked: "Fan ID under review — can’t buy yet",
      status: "under_review" as const,
      isSelf: false,
    };
    user.fans.push(fan);
    res.status(201).json(fan);
  });

  router.post("/fan-id/scan", auth, (req, res) => {
    const user = currentUser(res);
    const body = parseBody(fanIdScanRequestSchema, req);
    const scanId = store.id("scan");
    store.scans.set(scanId, { userId: user.id, documentType: body.documentType });
    const extracted: FanIdExtracted = {
      scanId,
      nameEn: user.fullName,
      nameAr: user.fullName === "Omar Khaled" ? "عمر خالد" : "الاسم كما في الوثيقة",
      idNumberMasked: body.documentType === "passport" ? "A •••• •• 21" : "2 98 •••• •••• 21",
      dateOfBirth: "14 / 03 / 1998",
    };
    res.json(extracted);
  });

  router.post("/fan-id", auth, (req, res) => {
    const user = currentUser(res);
    const body = parseBody(fanIdSubmitRequestSchema, req);
    const scan = store.scans.get(body.scanId);
    if (!scan || scan.userId !== user.id) throw new HttpError("NOT_FOUND", "Scan not found — photograph your document again");
    store.scans.delete(body.scanId);
    const digits = String(Math.floor(1000 + Math.random() * 8999));
    const number = `2210 4417 ${user.fanId.status === "approved" ? user.fanId.number.slice(-4) : digits}`;
    const validUntil = `Oct ${store.now().getUTCFullYear() + 3}`;
    user.fanId = { status: "approved", number, validUntil, nameEn: user.fullName };
    if (!user.fans.some((f) => f.isSelf)) {
      user.fans.unshift({
        id: store.id("fan"),
        name: `${shortName(user.fullName)} (you)`,
        initials: user.initials,
        fanIdMasked: `Fan ID •••• ${number.slice(-4)}`,
        status: "approved",
        isSelf: true,
      });
    }
    res.status(201).json(user.fanId);
  });

  return router;
}
