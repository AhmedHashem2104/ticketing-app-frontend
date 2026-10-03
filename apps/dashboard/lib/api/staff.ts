import {
  auditEntrySchema,
  entryScanSchema,
  entrySummarySchema,
  eventPerformanceSchema,
  eventReportSchema,
  eventRequestSchema,
  fanAccountRowSchema,
  fanIdReviewSchema,
  organizerRowSchema,
  overviewSchema,
  payoutSchema,
  refundReviewSchema,
  staffClientSessionSchema,
  staffOrderRowSchema,
  staffUserSchema,
  type CreateEventRequest,
  type EventStatusChange,
  type StaffLoginRequest,
} from "@repo/contracts";
import { z } from "zod";
import { api, ApiRequestError } from "./client";

/** Every staff endpoint, with responses validated against the shared contracts. */
const get = async <S extends z.ZodType>(schema: S, url: string, params?: Record<string, string | undefined>) =>
  schema.parse((await api.get(url, { params })).data) as z.output<S>;
const post = async <S extends z.ZodType>(schema: S, url: string, body: object = {}) =>
  schema.parse((await api.post(url, body)).data) as z.output<S>;

const ok = z.unknown();
const id = (value: string) => encodeURIComponent(value);

export const staffApi = {
  login: (body: StaffLoginRequest) => post(staffClientSessionSchema, "/staff/auth/login", body),
  logout: () => api.post("/staff/auth/logout"),
  /** The signed-in staff member, or null when signed out. */
  meOrNull: async () => {
    try {
      return await get(staffUserSchema, "/staff/me");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) return null;
      throw error;
    }
  },
  overview: () => get(overviewSchema, "/staff/overview"),
  events: () => get(z.array(eventPerformanceSchema), "/staff/events"),
  event: (eventId: string) => get(eventReportSchema, `/staff/events/${id(eventId)}`),
  changeStatus: (eventId: string, body: EventStatusChange) => post(ok, `/staff/events/${id(eventId)}/status`, body),
  requestChange: (eventId: string, body: CreateEventRequest) => post(eventRequestSchema, `/staff/events/${id(eventId)}/requests`, body),
  requests: () => get(z.array(eventRequestSchema), "/staff/requests"),
  approveRequest: (requestId: string) => post(ok, `/staff/requests/${id(requestId)}/approve`),
  rejectRequest: (requestId: string, reason: string) => post(ok, `/staff/requests/${id(requestId)}/reject`, { reason }),
  orders: (q?: string) => get(z.array(staffOrderRowSchema), "/staff/orders", { q: q || undefined }),
  fans: (q?: string) => get(z.array(fanAccountRowSchema), "/staff/fans", { q: q || undefined }),
  suspendFan: (userId: string, reason: string) => post(ok, `/staff/fans/${id(userId)}/suspend`, { reason }),
  reactivateFan: (userId: string) => post(ok, `/staff/fans/${id(userId)}/reactivate`),
  fanIds: () => get(z.array(fanIdReviewSchema), "/staff/fan-ids"),
  approveFanId: (userId: string) => post(ok, `/staff/fan-ids/${id(userId)}/approve`),
  rejectFanId: (userId: string, reason: string) => post(ok, `/staff/fan-ids/${id(userId)}/reject`, { reason }),
  refunds: (status?: string) => get(z.array(refundReviewSchema), "/staff/refunds", { status: status === "all" ? undefined : status }),
  approveRefund: (refundId: string) => post(ok, `/staff/refunds/${id(refundId)}/approve`),
  rejectRefund: (refundId: string, reason: string) => post(ok, `/staff/refunds/${id(refundId)}/reject`, { reason }),
  entry: (eventId: string) => get(entrySummarySchema, `/staff/events/${id(eventId)}/entry`),
  /** Admit or refuse a ticket. A refused scan (409) still returns the scan, so it's not an error here. */
  scan: async (body: { eventId: string; gate: string; token: string }) => {
    const res = await api.post("/staff/entry/scan", body, { validateStatus: (s) => s === 200 || s === 409 });
    return z.object({ scan: entryScanSchema, summary: entrySummarySchema }).parse(res.data);
  },
  sampleToken: (eventId: string) => get(z.object({ token: z.string() }), `/staff/events/${id(eventId)}/entry/sample-token`),
  organizers: () => get(z.array(organizerRowSchema), "/staff/organizers"),
  payouts: () => get(z.array(payoutSchema), "/staff/payouts"),
  audit: () => get(z.array(auditEntrySchema), "/staff/audit"),
};

export const staffKeys = {
  me: ["staff", "me"] as const,
  overview: ["staff", "overview"] as const,
  events: ["staff", "events"] as const,
  event: (eventId: string) => ["staff", "events", eventId] as const,
  entry: (eventId: string) => ["staff", "entry", eventId] as const,
  requests: ["staff", "requests"] as const,
  orders: (q: string) => ["staff", "orders", q] as const,
  fans: (q: string) => ["staff", "fans", q] as const,
  fanIds: ["staff", "fan-ids"] as const,
  refunds: (status: string) => ["staff", "refunds", status] as const,
  organizers: ["staff", "organizers"] as const,
  payouts: ["staff", "payouts"] as const,
  audit: ["staff", "audit"] as const,
};
