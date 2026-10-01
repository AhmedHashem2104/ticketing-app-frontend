import {
  alertSchema,
  cinemaSeatsSchema,
  eventDetailSchema,
  eventsResponseSchema,
  fanIdExtractedSchema,
  fanIdStatusSchema,
  holdSchema,
  homeResponseSchema,
  orderSchema,
  queueStatusSchema,
  refundOptionsSchema,
  refundSchema,
  resaleListingSchema,
  seatMapSchema,
  sessionSchema,
  signUpResponseSchema,
  ticketSchema,
  userSchema,
  type CreateOrderRequest,
  type EventsQuery,
  type FanIdScanRequest,
  type FanIdSubmitRequest,
  type HoldRequest,
  type LoginRequest,
  type RefundRequestInput,
  type ResaleListingRequest,
  type SignUpRequest,
  type TransferRequest,
} from "@repo/contracts";
import type { AxiosInstance } from "axios";
import { z } from "zod";
import { api as defaultClient, toApiError } from "./client";

/**
 * Typed Matchpass API. Every response is validated against the shared zod contract,
 * so a backend change that breaks the contract fails loudly instead of rendering garbage.
 */
export function createEndpoints(http: AxiosInstance) {
  async function call<S extends z.ZodType>(schema: S, request: Promise<{ data: unknown }>): Promise<z.output<S>> {
    try {
      const { data } = await request;
      return schema.parse(data);
    } catch (error) {
      throw toApiError(error);
    }
  }

  const query = (params: EventsQuery) => {
    const search = new URLSearchParams();
    if (params.tab) search.set("tab", params.tab);
    if (params.q) search.set("q", params.q);
    if (params.categories?.length) search.set("categories", params.categories.join(","));
    if (params.cities?.length) search.set("cities", params.cities.join(","));
    if (params.from) search.set("from", params.from);
    if (params.availableOnly) search.set("availableOnly", "true");
    return search.toString();
  };

  return {
    home: () => call(homeResponseSchema, http.get("/home")),
    events: (params: EventsQuery) => call(eventsResponseSchema, http.get(`/events?${query(params)}`)),
    event: (slug: string) => call(eventDetailSchema, http.get(`/events/${encodeURIComponent(slug)}`)),
    seatMap: (slug: string) => call(seatMapSchema, http.get(`/events/${encodeURIComponent(slug)}/seatmap`)),
    cinemaSeats: (slug: string, showtimeId: string) =>
      call(cinemaSeatsSchema, http.get(`/events/${encodeURIComponent(slug)}/showtimes/${encodeURIComponent(showtimeId)}/seats`)),
    notify: (slug: string) =>
      call(z.object({ subscribed: z.boolean() }), http.post(`/events/${encodeURIComponent(slug)}/notify`, { channel: "sms" })),
    presale: (slug: string, code: string) =>
      call(
        z.object({ valid: z.boolean(), code: z.string(), message: z.string() }),
        http.post(`/events/${encodeURIComponent(slug)}/presale`, { code }),
      ),
    alerts: () => call(z.array(alertSchema), http.get("/alerts")),

    signUp: (body: SignUpRequest) => call(signUpResponseSchema, http.post("/auth/signup", body)),
    resendCode: (verificationId: string) => call(z.object({ resendInSeconds: z.number() }), http.post("/auth/resend", { verificationId })),
    verify: (verificationId: string, code: string) => call(sessionSchema, http.post("/auth/verify", { verificationId, code })),
    login: (body: LoginRequest) => call(sessionSchema, http.post("/auth/login", body)),
    logout: () => call(z.unknown(), http.post("/auth/logout")),
    me: () => call(userSchema, http.get("/me")),
    scanFanId: (body: FanIdScanRequest) => call(fanIdExtractedSchema, http.post("/fan-id/scan", body)),
    submitFanId: (body: FanIdSubmitRequest) => call(fanIdStatusSchema, http.post("/fan-id", body)),

    joinQueue: (eventId: string) => call(queueStatusSchema, http.post("/queue", { eventId })),
    queue: (id: string) => call(queueStatusSchema, http.get(`/queue/${encodeURIComponent(id)}`)),
    setQueueSms: (id: string, smsOptIn: boolean) => call(queueStatusSchema, http.patch(`/queue/${encodeURIComponent(id)}`, { smsOptIn })),
    leaveQueue: (id: string) => call(z.unknown(), http.delete(`/queue/${encodeURIComponent(id)}`)),

    createHold: (body: HoldRequest) => call(holdSchema, http.post("/holds", body)),
    hold: (id: string) => call(holdSchema, http.get(`/holds/${encodeURIComponent(id)}`)),
    applyPromo: (holdId: string, code: string) => call(holdSchema, http.post(`/holds/${encodeURIComponent(holdId)}/promo`, { code })),
    createOrder: (body: CreateOrderRequest) => call(orderSchema, http.post("/orders", body)),
    order: (id: string) => call(orderSchema, http.get(`/orders/${encodeURIComponent(id)}`)),

    tickets: (scope: "upcoming" | "past" = "upcoming") => call(z.array(ticketSchema), http.get(`/tickets?scope=${scope}`)),
    ticket: (id: string) => call(ticketSchema, http.get(`/tickets/${encodeURIComponent(id)}`)),
    transfer: (id: string, body: TransferRequest) =>
      call(
        z.object({ ticketId: z.string(), status: z.string(), recipient: z.string(), message: z.string() }),
        http.post(`/tickets/${encodeURIComponent(id)}/transfer`, body),
      ),

    listings: () => call(z.array(resaleListingSchema), http.get("/resale/listings")),
    createListing: (body: ResaleListingRequest) => call(resaleListingSchema, http.post("/resale/listings", body)),
    withdrawListing: (id: string) => call(z.unknown(), http.delete(`/resale/listings/${encodeURIComponent(id)}`)),

    refundOptions: (orderId: string) => call(refundOptionsSchema, http.get(`/orders/${encodeURIComponent(orderId)}/refund-options`)),
    refunds: () => call(z.array(refundSchema), http.get("/refunds")),
    createRefund: (body: RefundRequestInput) => call(refundSchema, http.post("/refunds", body)),
    cancelRefund: (id: string) => call(refundSchema, http.post(`/refunds/${encodeURIComponent(id)}/cancel`)),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
export const endpoints = createEndpoints(defaultClient);
