import { z } from "zod";

export const idSchema = z.string().min(1).max(64);

export const currencySchema = z.literal("EGP");
export type Currency = z.infer<typeof currencySchema>;

/** Whole Egyptian pounds; the platform never charges fractions at checkout. */
export const amountSchema = z.number().nonnegative().finite();

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const themeSchema = z.enum(["pitch", "forest", "plum", "violet", "ink"]);
export type Theme = z.infer<typeof themeSchema>;

export const toneSchema = z.enum(["success", "warning", "danger", "neutral", "info"]);
export type Tone = z.infer<typeof toneSchema>;

/** Egyptian mobile number without the +20 country code, e.g. `1012345482`. */
export const egyptMobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(
    z.string().regex(/^1[0125]\d{8}$/, {
      error: "Enter a valid Egyptian mobile number, e.g. 10 1234 5678",
    }),
  );

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "HOLD_EXPIRED",
  "FAN_ID_REQUIRED",
  "LIMIT_EXCEEDED",
  "SEAT_UNAVAILABLE",
  "PAYMENT_DECLINED",
  "INVALID_CODE",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];
