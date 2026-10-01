import { z } from "zod";
import { amountSchema, egyptMobileSchema, idSchema, isoDateTimeSchema, themeSchema } from "./common";
import { eventKindSchema } from "./events";

/* ---------- Holds ---------- */

export const holdRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("zone"),
    eventId: idSchema,
    zoneId: idSchema,
    fanIds: z.array(idSchema).min(1, { error: "Choose at least one fan" }).max(4, { error: "Up to 4 tickets per order" }),
  }),
  z.object({
    type: z.literal("seats"),
    eventId: idSchema,
    showtimeId: idSchema.optional(),
    seatIds: z
      .array(z.string().regex(/^([NWES][1-4]-)?[A-Z]-\d{1,2}$/))
      .min(1, { error: "Pick at least one seat" })
      .max(10),
  }),
  z.object({
    type: z.literal("ticket_types"),
    eventId: idSchema,
    items: z
      .array(z.object({ ticketTypeId: idSchema, quantity: z.number().int().min(1).max(8) }))
      .min(1, { error: "Add at least one ticket" }),
  }),
]);
export type HoldRequest = z.infer<typeof holdRequestSchema>;

/** A price line. Discounts (promo codes) are negative lines. */
export const lineItemSchema = z.object({
  label: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().finite(),
  amount: z.number().finite(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const holderSchema = z.object({
  initials: z.string(),
  name: z.string(),
  detail: z.string(),
});
export type Holder = z.infer<typeof holderSchema>;

export const holdSchema = z.object({
  id: idSchema,
  eventId: idSchema,
  eventSlug: z.string(),
  eventTitle: z.string(),
  eventTag: z.string(),
  eventMeta: z.string(),
  eventKind: eventKindSchema,
  theme: themeSchema,
  expiresAt: isoDateTimeSchema,
  lines: z.array(lineItemSchema),
  seats: z.array(z.string()),
  ticketCount: z.number().int().positive(),
  subtotal: amountSchema,
  fees: amountSchema,
  discount: amountSchema,
  total: amountSchema,
  holdersTitle: z.string(),
  holders: z.array(holderSchema),
  holdersNote: z.string(),
  backHref: z.string(),
  promoCode: z.string().optional(),
});
export type Hold = z.infer<typeof holdSchema>;

/* ---------- Payment ---------- */

export const paymentMethodSchema = z.enum(["card", "wallet", "instapay", "fawry"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export const cardNumberSchema = z
  .string()
  .transform(digitsOnly)
  .pipe(
    z
      .string()
      .regex(/^\d{13,19}$/, { error: "Enter the full card number" })
      .refine(passesLuhn, { error: "This card number isn't valid" }),
  );

export const cardExpirySchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|1[0-2])\s?\/\s?(\d{2})$/, { error: "Use the format MM / YY" })
  .refine(
    (value) => {
      const [mm, yy] = value.split("/").map((part) => Number(part.trim()));
      const now = new Date();
      const expiry = new Date(2000 + (yy ?? 0), mm ?? 0, 1); // first day of the month after expiry
      return expiry > now;
    },
    { error: "This card has expired" },
  );

export const paymentDetailsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("card"),
    cardNumber: cardNumberSchema,
    expiry: cardExpirySchema,
    cvc: z.string().regex(/^\d{3,4}$/, { error: "Enter the 3 or 4 digit security code" }),
    nameOnCard: z.string().trim().min(2, { error: "Enter the name on the card" }),
    saveCard: z.boolean().default(false),
  }),
  z.object({ method: z.literal("wallet"), walletPhone: egyptMobileSchema }),
  z.object({ method: z.literal("instapay") }),
  z.object({ method: z.literal("fawry") }),
]);
export type PaymentDetails = z.input<typeof paymentDetailsSchema>;
export type PaymentDetailsParsed = z.output<typeof paymentDetailsSchema>;

export const checkoutFormSchema = z.object({
  payment: paymentDetailsSchema,
  acceptTerms: z.literal(true, { error: "Accept the terms of sale to pay" }),
});
export type CheckoutFormValues = z.input<typeof checkoutFormSchema>;

export const createOrderRequestSchema = checkoutFormSchema.extend({ holdId: idSchema });
export type CreateOrderRequest = z.input<typeof createOrderRequestSchema>;

export const promoRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,16}$/, { error: "Promo codes are 4–16 letters or numbers" }),
});
export type PromoRequest = z.input<typeof promoRequestSchema>;

/* ---------- Tickets ---------- */

export const ticketVariantSchema = z.enum(["ink", "lime", "purple"]);
export type TicketVariant = z.infer<typeof ticketVariantSchema>;

export const ticketStatusSchema = z.enum(["valid", "refund_pending", "refunded", "cancelled", "transferred", "listed"]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketSchema = z.object({
  id: idSchema,
  code: z.string(),
  orderId: idSchema,
  eventId: idSchema,
  eventSlug: z.string(),
  eventKind: eventKindSchema,
  theme: themeSchema,
  variant: ticketVariantSchema,
  status: ticketStatusSchema,
  kindLabel: z.string(),
  title: z.string(),
  startsAt: isoDateTimeSchema,
  dateLabel: z.string(),
  whenLabel: z.string(),
  time: z.string(),
  timeLabel: z.string(),
  venueName: z.string(),
  venueArea: z.string(),
  priceLabel: z.string(),
  price: amountSchema,
  fields: z.array(z.object({ key: z.string(), value: z.string() })).length(4),
  seatLabel: z.string(),
  holderName: z.string(),
  holderInitials: z.string(),
  holderDetail: z.string(),
  holderDate: z.string(),
  position: z.object({ index: z.number().int().positive(), of: z.number().int().positive() }),
  progress: z.number().min(0).max(100),
  qrReady: z.boolean(),
  qrUnlockLabel: z.string(),
  entryInfo: z.string(),
  transferMode: z.enum(["fan_id", "contact"]),
  transferNote: z.string(),
  refundable: z.boolean(),
  refundNote: z.string(),
  resaleAllowed: z.boolean(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const fanIdNumberSchema = z
  .string()
  .transform((v) => v.replace(/[\s•]/g, ""))
  .pipe(z.string().regex(/^\d{12}$/, { error: "Enter their 12-digit Fan ID number" }));

export const transferRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("fan_id"), recipient: fanIdNumberSchema }),
  z.object({
    mode: z.literal("contact"),
    recipient: z
      .string()
      .trim()
      .refine((value) => z.email().safeParse(value).success || egyptMobileSchema.safeParse(value.replace(/^\+20/, "")).success, {
        error: "Enter a mobile number or email address",
      }),
  }),
]);
export type TransferRequest = z.input<typeof transferRequestSchema>;

/* ---------- Orders ---------- */

export const orderSchema = z.object({
  id: idSchema,
  reference: z.string(),
  status: z.enum(["paid", "awaiting_payment"]),
  eventSlug: z.string(),
  eventTitle: z.string(),
  eventTag: z.string(),
  eventMeta: z.string(),
  eventKind: eventKindSchema,
  theme: themeSchema,
  entryNote: z.string(),
  total: amountSchema,
  paymentLabel: z.string(),
  fawryReference: z.string().optional(),
  createdAt: isoDateTimeSchema,
  tickets: z.array(ticketSchema),
  nextSteps: z.array(z.object({ title: z.string(), body: z.string() })),
  parkingOffer: z.object({ title: z.string(), detail: z.string(), price: amountSchema }).optional(),
});
export type Order = z.infer<typeof orderSchema>;

/* ---------- Resale ---------- */

export const payoutMethodSchema = z.enum(["wallet", "instapay", "bank"]);
export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

export const RESALE_FEE_RATE = 0.05;
export const RESALE_MIN_PRICE = 50;

export const resaleListingRequestSchema = z
  .object({
    ticketId: idSchema,
    price: z
      .number({ error: "Choose a price" })
      .int()
      .min(RESALE_MIN_PRICE, { error: `The minimum price is ${RESALE_MIN_PRICE} EGP` }),
    payoutMethod: payoutMethodSchema,
    iban: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.payoutMethod === "bank" && !/^EG\d{27}$/.test((value.iban ?? "").replace(/\s/g, ""))) {
      ctx.addIssue({ code: "custom", path: ["iban"], message: "Enter a valid Egyptian IBAN (EG + 27 digits)" });
    }
  });
export type ResaleListingRequest = z.input<typeof resaleListingRequestSchema>;

export const resaleListingSchema = z.object({
  id: idSchema,
  ticketId: idSchema,
  title: z.string(),
  price: amountSchema,
  payout: amountSchema,
  status: z.enum(["listed", "sold"]),
  detail: z.string(),
});
export type ResaleListing = z.infer<typeof resaleListingSchema>;

export const resaleQuote = (price: number) => {
  const fee = Math.round(price * RESALE_FEE_RATE * 100) / 100;
  return { price, fee, payout: Math.round((price - fee) * 100) / 100 };
};

/* ---------- Refunds ---------- */

export const refundReasonSchema = z.enum(["cant_attend", "wrong_tickets", "details_changed", "other"]);
export type RefundReason = z.infer<typeof refundReasonSchema>;

export const refundReasonLabels: Record<RefundReason, string> = {
  cant_attend: "I can’t attend anymore",
  wrong_tickets: "I bought the wrong tickets",
  details_changed: "The event details changed",
  other: "Something else",
};

export const refundMethodSchema = z.enum(["card", "wallet", "credit"]);
export type RefundMethod = z.infer<typeof refundMethodSchema>;

export const refundRequestSchema = z.object({
  orderId: idSchema,
  ticketIds: z.array(idSchema).min(1, { error: "Choose at least one ticket." }),
  reason: refundReasonSchema,
  details: z.string().trim().max(500, { error: "Keep it under 500 characters" }).optional(),
  method: refundMethodSchema,
  acknowledge: z.literal(true, { error: "Tick the box to confirm." }),
});
export type RefundRequestInput = z.input<typeof refundRequestSchema>;

export const refundStepSchema = z.object({
  label: z.string(),
  when: z.string(),
  state: z.enum(["done", "current", "todo", "failed"]),
});
export type RefundStep = z.infer<typeof refundStepSchema>;

export const refundSchema = z.object({
  id: idSchema,
  reference: z.string(),
  orderId: idSchema,
  requestedLabel: z.string(),
  eventTitle: z.string(),
  detail: z.string(),
  amount: amountSchema,
  destination: z.string(),
  status: z.enum(["in_review", "refunded", "rejected", "cancelled"]),
  statusLabel: z.string(),
  steps: z.array(refundStepSchema),
  note: z.string().optional(),
  noteTone: z.enum(["neutral", "success", "danger"]),
  canCancel: z.boolean(),
  secondaryAction: z.string(),
  refundedTicket: ticketSchema.optional(),
});
export type Refund = z.infer<typeof refundSchema>;

export const refundOptionsSchema = z.object({
  orderId: idSchema,
  reference: z.string(),
  eventTitle: z.string(),
  eventDateLabel: z.string(),
  tickets: z.array(z.object({ id: idSchema, label: z.string(), meta: z.string(), price: amountSchema })),
  serviceFeePerTicket: amountSchema,
  deadlineNote: z.string(),
  methods: z.array(
    z.object({
      id: refundMethodSchema,
      name: z.string(),
      note: z.string(),
      time: z.string(),
      tag: z.string(),
      bonusRate: z.number().min(0).max(1),
    }),
  ),
});
export type RefundOptions = z.infer<typeof refundOptionsSchema>;
