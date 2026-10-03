import { z } from "zod";
import { amountSchema, idSchema, imageUrlSchema, isoDateTimeSchema } from "./common";
import { eventKindSchema, saleStatusSchema } from "./events";

/* ---------- Staff accounts and permissions ---------- */

/**
 * Who works in the dashboard:
 * - `admin` — runs the platform: every event, user, organiser, payout and the audit log.
 * - `operations` — the fan-facing desk: Fan ID reviews, refund decisions, order lookup and match-day entry.
 * - `organizer` — a club or promoter: sales, entry and payouts for their own events only.
 */
export const staffRoleSchema = z.enum(["admin", "operations", "organizer"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const staffPermissionSchema = z.enum([
  "overview:read",
  "events:read",
  "events:manage",
  "events:request",
  "orders:read",
  "users:read",
  "users:manage",
  "fanid:review",
  "refunds:review",
  "entry:read",
  "entry:scan",
  "organizers:read",
  "payouts:read",
  "requests:review",
  "audit:read",
]);
export type StaffPermission = z.infer<typeof staffPermissionSchema>;

/** The single source of truth for what each role may do — enforced by the API, mirrored by the UI. */
export const permissionsByRole: Record<StaffRole, readonly StaffPermission[]> = {
  admin: [
    "overview:read",
    "events:read",
    "events:manage",
    "orders:read",
    "users:read",
    "users:manage",
    "fanid:review",
    "refunds:review",
    "entry:read",
    "entry:scan",
    "organizers:read",
    "payouts:read",
    "requests:review",
    "audit:read",
  ],
  operations: ["overview:read", "events:read", "orders:read", "users:read", "fanid:review", "refunds:review", "entry:read", "entry:scan"],
  organizer: ["overview:read", "events:read", "events:request", "orders:read", "entry:read", "payouts:read"],
};

export const can = (role: StaffRole, permission: StaffPermission) => permissionsByRole[role].includes(permission);

export const staffUserSchema = z.object({
  id: idSchema,
  name: z.string(),
  initials: z.string(),
  email: z.email(),
  role: staffRoleSchema,
  avatarUrl: imageUrlSchema.optional(),
  /** Organisers only: the club or promoter they work for. */
  organizerId: idSchema.optional(),
  organizerName: z.string().optional(),
  permissions: z.array(staffPermissionSchema),
});
export type StaffUser = z.infer<typeof staffUserSchema>;

export const staffLoginRequestSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Enter your password" }),
});
export type StaffLoginRequest = z.input<typeof staffLoginRequestSchema>;

export const staffSessionSchema = z.object({ token: z.string().min(16), staff: staffUserSchema });
export type StaffSession = z.infer<typeof staffSessionSchema>;
export const staffClientSessionSchema = z.object({ staff: staffUserSchema });

/* ---------- Overview ---------- */

export const kpiSchema = z.object({
  id: z.enum(["revenue", "tickets", "orders", "checkins", "fanid_queue", "refund_queue", "resale", "fans"]),
  label: z.string(),
  value: z.number(),
  format: z.enum(["money", "number", "percent"]),
  /** Change against the previous 7 days, as a fraction (0.12 = +12%). */
  change: z.number().optional(),
  hint: z.string().optional(),
});
export type Kpi = z.infer<typeof kpiSchema>;

export const salesPointSchema = z.object({ date: z.iso.date(), revenue: amountSchema, tickets: z.number().int().nonnegative() });
export type SalesPoint = z.infer<typeof salesPointSchema>;

export const eventPerformanceSchema = z.object({
  eventId: idSchema,
  slug: z.string(),
  title: z.string(),
  imageUrl: imageUrlSchema.optional(),
  kind: eventKindSchema,
  startsAt: isoDateTimeSchema,
  status: saleStatusSchema,
  statusLabel: z.string(),
  venue: z.string(),
  organizerId: idSchema,
  organizerName: z.string(),
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  revenue: amountSchema,
  checkedIn: z.number().int().nonnegative(),
});
export type EventPerformance = z.infer<typeof eventPerformanceSchema>;

export const overviewSchema = z.object({
  kpis: z.array(kpiSchema),
  sales: z.array(salesPointSchema),
  topEvents: z.array(eventPerformanceSchema),
  tasks: z.array(z.object({ id: z.string(), label: z.string(), count: z.number().int().nonnegative(), href: z.string() })),
});
export type Overview = z.infer<typeof overviewSchema>;

/* ---------- Events ---------- */

export const zoneSalesSchema = z.object({
  name: z.string(),
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  price: amountSchema,
  revenue: amountSchema,
});
export type ZoneSales = z.infer<typeof zoneSalesSchema>;

export const eventReportSchema = eventPerformanceSchema.extend({
  zones: z.array(zoneSalesSchema),
  sales: z.array(salesPointSchema),
  resale: z.object({ listed: z.number().int().nonnegative(), sold: z.number().int().nonnegative() }),
  refunds: z.object({ requested: z.number().int().nonnegative(), refunded: amountSchema }),
  fees: amountSchema,
  net: amountSchema,
  pendingRequest: z.lazy(() => eventRequestSchema).optional(),
});
export type EventReport = z.infer<typeof eventReportSchema>;

export const eventStatusChangeSchema = z.object({
  status: z.enum(["cancelled", "postponed", "on_sale"]),
  reason: z.string().trim().min(5, { error: "Tell fans why (at least 5 characters)" }).max(300),
});
export type EventStatusChange = z.input<typeof eventStatusChangeSchema>;

/* ---------- Organiser change requests (cancel / postpone need an admin) ---------- */

export const eventRequestSchema = z.object({
  id: idSchema,
  eventId: idSchema,
  eventTitle: z.string(),
  organizerName: z.string(),
  requestedBy: z.string(),
  type: z.enum(["cancel", "postpone"]),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: isoDateTimeSchema,
  decidedBy: z.string().optional(),
  decisionNote: z.string().optional(),
});
export type EventRequest = z.infer<typeof eventRequestSchema>;

export const createEventRequestSchema = z.object({
  type: z.enum(["cancel", "postpone"]),
  reason: z.string().trim().min(5, { error: "Tell fans why (at least 5 characters)" }).max(300),
});
export type CreateEventRequest = z.input<typeof createEventRequestSchema>;

export const decisionSchema = z.object({ note: z.string().trim().max(300).optional() });
export const rejectionSchema = z.object({ reason: z.string().trim().min(5, { error: "Give a reason (at least 5 characters)" }).max(300) });
export type Rejection = z.input<typeof rejectionSchema>;

/* ---------- Orders ---------- */

export const staffOrderRowSchema = z.object({
  id: idSchema,
  reference: z.string(),
  customer: z.string(),
  phoneMasked: z.string(),
  eventTitle: z.string(),
  eventId: idSchema,
  tickets: z.number().int().nonnegative(),
  total: amountSchema,
  method: z.enum(["card", "wallet", "instapay", "fawry"]),
  status: z.string(),
  statusLabel: z.string(),
  createdAt: isoDateTimeSchema,
});
export type StaffOrderRow = z.infer<typeof staffOrderRowSchema>;

/* ---------- Fans ---------- */

export const fanAccountRowSchema = z.object({
  id: idSchema,
  fullName: z.string(),
  initials: z.string(),
  avatarUrl: imageUrlSchema.optional(),
  phoneMasked: z.string(),
  email: z.string().optional(),
  fanIdStatus: z.enum(["none", "pending", "approved"]),
  orders: z.number().int().nonnegative(),
  tickets: z.number().int().nonnegative(),
  spent: amountSchema,
  suspended: z.boolean(),
});
export type FanAccountRow = z.infer<typeof fanAccountRowSchema>;

export const fanIdReviewSchema = z.object({
  userId: idSchema,
  fullName: z.string(),
  initials: z.string(),
  phoneMasked: z.string(),
  submittedAt: isoDateTimeSchema,
  documentType: z.enum(["national_id", "passport"]),
  nameEn: z.string(),
  nameAr: z.string(),
  idNumberMasked: z.string(),
  documentImageUrl: imageUrlSchema,
  selfieImageUrl: imageUrlSchema,
  /** The automatic check's verdict, shown to the reviewer. */
  matchScore: z.number().min(0).max(1),
  flags: z.array(z.string()),
});
export type FanIdReview = z.infer<typeof fanIdReviewSchema>;

/* ---------- Refunds ---------- */

export const refundReviewSchema = z.object({
  id: idSchema,
  reference: z.string(),
  customer: z.string(),
  eventTitle: z.string(),
  imageUrl: imageUrlSchema.optional(),
  detail: z.string(),
  reason: z.string(),
  amount: amountSchema,
  destination: z.string(),
  status: z.enum(["in_review", "refunded", "rejected", "cancelled"]),
  statusLabel: z.string(),
  requestedAt: isoDateTimeSchema,
});
export type RefundReview = z.infer<typeof refundReviewSchema>;

/* ---------- Entry ---------- */

export const entryScanSchema = z.object({
  id: idSchema,
  at: isoDateTimeSchema,
  ticketCode: z.string(),
  holderName: z.string(),
  gate: z.string(),
  result: z.enum(["admitted", "already_used", "expired", "invalid", "not_valid"]),
  resultLabel: z.string(),
});
export type EntryScan = z.infer<typeof entryScanSchema>;

export const entrySummarySchema = z.object({
  eventId: idSchema,
  eventTitle: z.string(),
  sold: z.number().int().nonnegative(),
  checkedIn: z.number().int().nonnegative(),
  gates: z.array(z.object({ gate: z.string(), checkedIn: z.number().int().nonnegative() })),
  recent: z.array(entryScanSchema),
});
export type EntrySummary = z.infer<typeof entrySummarySchema>;

export const gateScanRequestSchema = z.object({
  eventId: idSchema,
  gate: z.string().trim().min(1).max(20),
  token: z.string().trim().min(1, { error: "Scan or paste the ticket QR" }),
});
export type GateScanRequest = z.input<typeof gateScanRequestSchema>;

/* ---------- Organisers and payouts ---------- */

export const organizerRowSchema = z.object({
  id: idSchema,
  name: z.string(),
  logoUrl: imageUrlSchema.optional(),
  events: z.number().int().nonnegative(),
  ticketsSold: z.number().int().nonnegative(),
  revenue: amountSchema,
  payoutDue: amountSchema,
});
export type OrganizerRow = z.infer<typeof organizerRowSchema>;

export const payoutSchema = z.object({
  id: idSchema,
  organizerId: idSchema,
  organizerName: z.string(),
  period: z.string(),
  gross: amountSchema,
  fees: amountSchema,
  refunds: amountSchema,
  net: amountSchema,
  status: z.enum(["scheduled", "paid"]),
  statusLabel: z.string(),
  payDate: z.iso.date(),
});
export type Payout = z.infer<typeof payoutSchema>;

/* ---------- Audit log ---------- */

export const auditEntrySchema = z.object({
  id: idSchema,
  at: isoDateTimeSchema,
  actor: z.string(),
  role: staffRoleSchema,
  action: z.string(),
  target: z.string(),
  detail: z.string().optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
