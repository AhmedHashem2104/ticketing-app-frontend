import { z } from "zod";
import { egyptMobileSchema, idSchema } from "./common";

export const fanSchema = z.object({
  id: idSchema,
  name: z.string(),
  initials: z.string().min(1).max(3),
  fanIdMasked: z.string(),
  status: z.enum(["approved", "under_review"]),
  isSelf: z.boolean(),
});
export type Fan = z.infer<typeof fanSchema>;

export const fanIdStatusSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("none") }),
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("approved"),
    number: z.string().regex(/^\d{4} \d{4} \d{4}$/),
    validUntil: z.string(),
    nameEn: z.string(),
  }),
]);
export type FanIdStatus = z.infer<typeof fanIdStatusSchema>;

export const userSchema = z.object({
  id: idSchema,
  fullName: z.string(),
  initials: z.string(),
  phoneMasked: z.string(),
  email: z.email().optional(),
  fanId: fanIdStatusSchema,
  linkedFans: z.array(fanSchema),
  credit: z.number().nonnegative(),
});
export type User = z.infer<typeof userSchema>;

export const passwordSchema = z.string().min(8, { error: "Use at least 8 characters" }).max(72, { error: "Use 72 characters or fewer" });

export const signUpRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { error: "Enter your full name as it appears on your ID" })
    .max(80, { error: "Name is too long" })
    .regex(/^[\p{L}][\p{L}\s.'-]+$/u, { error: "Use letters only" })
    .refine((value) => value.split(/\s+/).length >= 2, { error: "Enter your first and last name" }),
  phone: egyptMobileSchema,
  email: z.union([z.literal(""), z.email({ error: "Enter a valid email address" })]).optional(),
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "You need to accept the terms to continue" }),
  marketing: z.boolean().default(false),
});
export type SignUpRequest = z.input<typeof signUpRequestSchema>;
export type SignUpValues = z.output<typeof signUpRequestSchema>;

export const signUpResponseSchema = z.object({
  verificationId: idSchema,
  maskedPhone: z.string(),
  resendInSeconds: z.number().int().nonnegative(),
});
export type SignUpResponse = z.infer<typeof signUpResponseSchema>;

export const otpCodeSchema = z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code" });

export const verifyOtpRequestSchema = z.object({
  verificationId: idSchema,
  code: otpCodeSchema,
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

export const loginRequestSchema = z.object({
  phone: egyptMobileSchema,
  password: z.string().min(1, { error: "Enter your password" }),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const sessionSchema = z.object({ token: z.string().min(16), user: userSchema });
export type Session = z.infer<typeof sessionSchema>;

/* ---------- Fan ID ---------- */

export const documentTypeSchema = z.enum(["national_id", "passport"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const fanIdScanRequestSchema = z
  .object({
    documentType: documentTypeSchema,
    frontCaptured: z.boolean(),
    backCaptured: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.frontCaptured) ctx.addIssue({ code: "custom", path: ["frontCaptured"], message: "Add a photo of the front" });
    if (value.documentType === "national_id" && !value.backCaptured) {
      ctx.addIssue({ code: "custom", path: ["backCaptured"], message: "Add a photo of the back" });
    }
  });
export type FanIdScanRequest = z.infer<typeof fanIdScanRequestSchema>;

export const fanIdExtractedSchema = z.object({
  scanId: idSchema,
  nameEn: z.string(),
  nameAr: z.string(),
  idNumberMasked: z.string(),
  dateOfBirth: z.string(),
});
export type FanIdExtracted = z.infer<typeof fanIdExtractedSchema>;

export const fanIdSubmitRequestSchema = z.object({
  scanId: idSchema,
  selfieCaptured: z.literal(true, { error: "Take a selfie to continue" }),
  confirmDetails: z.literal(true, { error: "Confirm your details to continue" }),
});
export type FanIdSubmitRequest = z.infer<typeof fanIdSubmitRequestSchema>;

export const linkFanRequestSchema = z.object({
  name: z.string().trim().min(3, { error: "Enter their full name" }),
  fanIdNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{12}$/, { error: "Fan ID numbers have 12 digits" })),
});
export type LinkFanRequest = z.input<typeof linkFanRequestSchema>;
