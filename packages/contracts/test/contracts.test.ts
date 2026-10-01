import { describe, expect, it } from "vitest";
import {
  cardExpirySchema,
  cardNumberSchema,
  checkoutFormSchema,
  countAvailable,
  egyptMobileSchema,
  eventsQuerySchema,
  formatAmount,
  formatClock,
  formatMoney,
  holdRequestSchema,
  initialsOf,
  passesLuhn,
  refundRequestSchema,
  resaleListingRequestSchema,
  resaleQuote,
  segmentRow,
  signUpRequestSchema,
  splitDuration,
  transferRequestSchema,
} from "../src";

describe("egyptMobileSchema", () => {
  it.each(["1012345482", "10 1234 5482", "1112345678", "1512345678"])("accepts %s", (value) => {
    expect(egyptMobileSchema.safeParse(value).success).toBe(true);
  });
  it.each(["0101234548", "1312345678", "10123", "abc"])("rejects %s", (value) => {
    expect(egyptMobileSchema.safeParse(value).success).toBe(false);
  });
  it("normalises spaces and dashes", () => {
    expect(egyptMobileSchema.parse("10 1234-5482")).toBe("1012345482");
  });
});

describe("signUpRequestSchema", () => {
  const valid = { fullName: "Omar Khaled", phone: "1012345482", password: "matchpass", acceptTerms: true as const };

  it("accepts a valid sign up and defaults marketing", () => {
    expect(signUpRequestSchema.parse(valid)).toMatchObject({ marketing: false, phone: "1012345482" });
  });

  it("requires two names, terms and an 8-char password", () => {
    const result = signUpRequestSchema.safeParse({ ...valid, fullName: "Omar", password: "short", acceptTerms: false });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["fullName", "password", "acceptTerms"]));
  });

  it("allows an empty optional email but rejects a malformed one", () => {
    expect(signUpRequestSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(signUpRequestSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("payment", () => {
  it("validates Luhn", () => {
    expect(passesLuhn("4242424242424242")).toBe(true);
    expect(passesLuhn("4242424242424241")).toBe(false);
  });

  it("normalises card numbers", () => {
    expect(cardNumberSchema.parse("4242 4242 4242 4242")).toBe("4242424242424242");
  });

  it("rejects past expiry dates and bad formats", () => {
    expect(cardExpirySchema.safeParse("01 / 20").success).toBe(false);
    expect(cardExpirySchema.safeParse("13/40").success).toBe(false);
    expect(cardExpirySchema.safeParse("12 / 49").success).toBe(true);
  });

  it("requires terms acceptance and the right fields per method", () => {
    expect(checkoutFormSchema.safeParse({ payment: { method: "instapay" }, acceptTerms: true }).success).toBe(true);
    expect(checkoutFormSchema.safeParse({ payment: { method: "instapay" }, acceptTerms: false }).success).toBe(false);
    expect(checkoutFormSchema.safeParse({ payment: { method: "wallet", walletPhone: "123" }, acceptTerms: true }).success).toBe(false);
  });
});

describe("holdRequestSchema", () => {
  it("caps zone orders at 4 fans", () => {
    const fanIds = ["a", "b", "c", "d", "e"];
    expect(holdRequestSchema.safeParse({ type: "zone", eventId: "e", zoneId: "cat1", fanIds }).success).toBe(false);
  });

  it("validates seat id formats", () => {
    expect(holdRequestSchema.safeParse({ type: "seats", eventId: "e", seatIds: ["W2-A-5", "C-12"] }).success).toBe(true);
    expect(holdRequestSchema.safeParse({ type: "seats", eventId: "e", seatIds: ["bad"] }).success).toBe(false);
  });
});

describe("transfers, resale and refunds", () => {
  it("validates transfer recipients per mode", () => {
    expect(transferRequestSchema.safeParse({ mode: "fan_id", recipient: "2210 4417 1907" }).success).toBe(true);
    expect(transferRequestSchema.safeParse({ mode: "fan_id", recipient: "123" }).success).toBe(false);
    expect(transferRequestSchema.safeParse({ mode: "contact", recipient: "friend@mail.com" }).success).toBe(true);
    expect(transferRequestSchema.safeParse({ mode: "contact", recipient: "+201012345678" }).success).toBe(true);
    expect(transferRequestSchema.safeParse({ mode: "contact", recipient: "hello" }).success).toBe(false);
  });

  it("requires an IBAN for bank payouts", () => {
    const base = { ticketId: "t1", price: 200 };
    expect(resaleListingRequestSchema.safeParse({ ...base, payoutMethod: "wallet" }).success).toBe(true);
    expect(resaleListingRequestSchema.safeParse({ ...base, payoutMethod: "bank" }).success).toBe(false);
    expect(resaleListingRequestSchema.safeParse({ ...base, payoutMethod: "bank", iban: "EG380019000500000000263180002" }).success).toBe(
      true,
    );
  });

  it("quotes the 5% resale fee", () => {
    expect(resaleQuote(250)).toEqual({ price: 250, fee: 12.5, payout: 237.5 });
  });

  it("requires refund acknowledgement", () => {
    const base = { orderId: "o", ticketIds: ["t"], reason: "cant_attend", method: "card" } as const;
    expect(refundRequestSchema.safeParse({ ...base, acknowledge: true }).success).toBe(true);
    expect(refundRequestSchema.safeParse({ ...base, acknowledge: false }).success).toBe(false);
  });
});

describe("eventsQuerySchema", () => {
  it("parses comma separated filters and boolean flags", () => {
    expect(eventsQuerySchema.parse({ tab: "concerts", cities: "cairo,alexandria", availableOnly: "true" })).toEqual({
      tab: "concerts",
      cities: ["cairo", "alexandria"],
      availableOnly: true,
    });
  });

  it("defaults to matches", () => {
    expect(eventsQuerySchema.parse({}).tab).toBe("matches");
  });
});

describe("seating helpers", () => {
  it("segments rows at aisles keeping seat numbers", () => {
    const segments = segmentRow("aaxaaw", [2, 4]);
    expect(segments.map((segment) => segment.map((seat) => seat.number))).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(segments[1]?.[0]?.code).toBe("x");
  });

  it("counts available seats", () => {
    expect(countAvailable([{ seats: "aax" }, { seats: "wxa" }])).toBe(4);
  });
});

describe("formatting", () => {
  it("formats money", () => {
    expect(formatMoney(1850)).toBe("1,850 EGP");
    expect(formatMoney(47.5)).toBe("47.50 EGP");
    expect(formatAmount(500)).toBe("500.00");
  });

  it("formats clocks and durations", () => {
    expect(formatClock(582)).toBe("09:42");
    expect(formatClock(-5)).toBe("00:00");
    expect(splitDuration(2 * 86400 + 4 * 3600 + 12 * 60 + 36)).toEqual({ days: 2, hours: 4, minutes: 12, seconds: 36 });
  });

  it("builds initials", () => {
    expect(initialsOf("Omar Khaled Hassan")).toBe("OK");
  });
});

describe("production contract additions", () => {
  it("never accepts card data in the order request", async () => {
    const { createOrderRequestSchema, hostedCardFormSchema } = await import("../src");
    const parsed = createOrderRequestSchema.parse({ holdId: "h", payment: { method: "card", cardNumber: "4242424242424242" }, acceptTerms: true });
    expect(parsed.payment).toEqual({ method: "card" });
    expect(hostedCardFormSchema.safeParse({ cardNumber: "4242 4242 4242 4242", expiry: "12/49", cvc: "123", nameOnCard: "Omar" }).success).toBe(true);
  });

  it("validates Fan ID photos by type and size", async () => {
    const { fanIdDocumentsSchema, fanIdSubmitRequestSchema, FAN_ID_MAX_IMAGE_BYTES } = await import("../src");
    const photo = { type: "image/jpeg", size: 1000 };
    expect(fanIdDocumentsSchema.safeParse({ documentType: "national_id", front: photo, back: photo }).success).toBe(true);
    expect(fanIdDocumentsSchema.safeParse({ documentType: "passport", front: photo }).success).toBe(true);
    const missingBack = fanIdDocumentsSchema.safeParse({ documentType: "national_id", front: photo });
    expect(missingBack.error?.issues[0]?.message).toBe("Add a photo of the back");
    expect(fanIdDocumentsSchema.safeParse({ documentType: "passport", front: { type: "application/pdf", size: 10 } }).success).toBe(false);
    expect(fanIdDocumentsSchema.safeParse({ documentType: "passport", front: { type: "image/png", size: FAN_ID_MAX_IMAGE_BYTES + 1 } }).success).toBe(false);
    expect(fanIdSubmitRequestSchema.safeParse({ scanId: "s", confirmDetails: true }).error?.issues[0]?.message).toBe("Take a selfie to continue");
  });

  it("requires matching passwords on reset and supports resale holds", async () => {
    const { resetPasswordRequestSchema, holdRequestSchema } = await import("../src");
    const base = { verificationId: "v", code: "123456", password: "newpassword" };
    expect(resetPasswordRequestSchema.safeParse({ ...base, confirmPassword: "newpassword" }).success).toBe(true);
    expect(resetPasswordRequestSchema.safeParse({ ...base, confirmPassword: "other" }).error?.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(holdRequestSchema.safeParse({ type: "resale", eventId: "e", listingId: "l" }).success).toBe(true);
  });
});
