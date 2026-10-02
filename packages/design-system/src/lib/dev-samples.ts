import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";

/**
 * Sample values for the development "Autofill" buttons. They match the mock API's seed data
 * (accounts, SMS code, promo and presale codes, Fan ID numbers), so autofilled forms go through
 * every flow end to end. Only used when `UIProvider` has `devTools` on — never in production.
 */
export const devSamples = {
  /** Seeded demo account (Omar Khaled): approved Fan ID, linked fans and tickets. */
  login: { phone: "10 1234 5482", password: "matchpass123" },
  /** The mock API accepts this SMS code for every sign-up and password reset. */
  otp: "123456",
  newPassword: "matchpass123",
  /** An approved Fan ID that isn't linked to the demo account yet (Karim Nabil). */
  linkFan: { name: "Karim Nabil", fanIdNumber: "2210 4417 5555" },
  /** Transfer recipients — the second seeded account (Youssef Adel). */
  transfer: { fan_id: "2210 4417 1907", contact: "youssef.a@mail.com" },
  walletPhone: "10 1234 5482",
  promoCode: "MATCHPASS10",
  presaleCode: "LAYLA24",
  iban: "EG38 0019 0005 0000 0000 2631 8000 2",
  refundDetails: "Plans changed and I can no longer make this date.",
  /** Seeded staff accounts (dashboard) all share this password. */
  staffPassword: "matchpass-staff",
  /** A reason staff give when rejecting or cancelling — fans read it. */
  staffReason: "The photo of the ID is too blurry to read. Please upload a sharper one.",
} as const;

const FIRST_NAMES = ["Sara", "Nour", "Laila", "Ahmed", "Mostafa", "Hana", "Yassin", "Salma"];
const LAST_NAMES = ["Ahmed", "Hassan", "Mahmoud", "Farouk", "Saleh", "Ibrahim", "Fathy", "Nasser"];
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

/** A fresh sign-up every time: a random name and a random mobile number, so it never collides. */
export function sampleSignUp() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const digits = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return {
    fullName: `${first} ${last}`,
    phone: `11 ${digits.slice(0, 4)} ${digits.slice(4)}`,
    email: `${first}.${last}.${digits.slice(-3)}@example.com`.toLowerCase(),
    password: devSamples.newPassword,
    acceptTerms: true as const,
    marketing: false,
  };
}

/** Sets several fields at once, validating and marking them dirty and touched like real typing. */
export function fillForm<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, "setValue">,
  values: Partial<{ [K in Path<T>]: PathValue<T, K> }>,
) {
  for (const [name, value] of Object.entries(values) as [Path<T>, PathValue<T, Path<T>>][]) {
    form.setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }
}

/** Smallest valid JPEG (1×1), used where a canvas isn't available (tests). */
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

function drawSample(ctx: CanvasRenderingContext2D, kind: "front" | "back" | "selfie", width: number, height: number) {
  if (kind === "selfie") {
    ctx.fillStyle = "#d9e4dc";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#c8a27a";
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.42, width * 0.25, height * 0.23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d5c3a";
    ctx.fillRect(width * 0.17, height * 0.73, width * 0.66, height * 0.27);
    return;
  }
  ctx.fillStyle = "#e8efe9";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1d5c3a";
  ctx.fillRect(0, 0, width, 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(kind === "front" ? "ARAB REPUBLIC OF EGYPT" : "NATIONAL ID · BACK", 24, 46);
  ctx.fillStyle = "#121512";
  ctx.font = "22px sans-serif";
  const x = kind === "front" ? 220 : 24;
  ["Omar Khaled", "2990 1011 2345 67", "01 / 01 / 1999"].forEach((line, i) => ctx.fillText(line, x, 140 + i * 48));
  if (kind === "front") {
    ctx.fillStyle = "#c8a27a";
    ctx.fillRect(28, 100, 160, 200);
  }
}

/** A sample photo for the Fan ID uploads: an ID card or selfie drawn on a canvas, saved as JPEG. */
export async function sampleImageFile(kind: "front" | "back" | "selfie"): Promise<File> {
  const name = `sample-${kind}.jpg`;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : undefined;
  let ctx: CanvasRenderingContext2D | null;
  try {
    ctx = canvas?.getContext("2d") ?? null;
  } catch {
    ctx = null; // jsdom without the canvas package
  }
  if (canvas && ctx) {
    canvas.width = kind === "selfie" ? 480 : 640;
    canvas.height = kind === "selfie" ? 640 : 404;
    drawSample(ctx, kind, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) return new File([blob], name, { type: "image/jpeg" });
  }
  const bytes = Uint8Array.from(atob(TINY_JPEG_BASE64), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: "image/jpeg" });
}
