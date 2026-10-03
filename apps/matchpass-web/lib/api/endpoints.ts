import {
  alertSchema,
  cinemaSeatsSchema,
  clientSessionSchema,
  eventDetailSchema,
  eventsResponseSchema,
  fanIdExtractedSchema,
  fanEligibilitySchema,
  fanIdStatusSchema,
  fanSchema,
  holdSchema,
  homeResponseSchema,
  notificationSchema,
  orderSchema,
  qrTokenSchema,
  queueStatusSchema,
  refundOptionsSchema,
  refundSchema,
  resaleListingSchema,
  resaleOfferSchema,
  seatMapSchema,
  signUpResponseSchema,
  ticketSchema,
  transferSchema,
  transfersResponseSchema,
  userSchema,
  type CreateOrderRequest,
  type DocumentType,
  type EventsQuery,
  type ForgotPasswordRequest,
  type HoldRequest,
  type LinkFanRequest,
  type LoginRequest,
  type PreferencesRequest,
  type RefundRequestInput,
  type ResaleListingRequest,
  type ResetPasswordRequest,
  type SignUpRequest,
  type TransferRequest,
} from "@repo/contracts";
import type { AxiosInstance } from "axios";
import { z } from "zod";
import { api as defaultClient, ApiRequestError, toApiError } from "./client";

const enc = encodeURIComponent;

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

  const me = () => call(userSchema, http.get("/me"));

  return {
    home: () => call(homeResponseSchema, http.get("/home")),
    events: (params: EventsQuery) => call(eventsResponseSchema, http.get(`/events?${query(params)}`)),
    event: (slug: string) => call(eventDetailSchema, http.get(`/events/${enc(slug)}`)),
    seatMap: (slug: string) => call(seatMapSchema, http.get(`/events/${enc(slug)}/seatmap`)),
    cinemaSeats: (slug: string, showtimeId: string) =>
      call(cinemaSeatsSchema, http.get(`/events/${enc(slug)}/showtimes/${enc(showtimeId)}/seats`)),
    resaleOffers: (slug: string) => call(z.array(resaleOfferSchema), http.get(`/events/${enc(slug)}/resale`)),
    fanEligibility: (slug: string) => call(z.array(fanEligibilitySchema), http.get(`/events/${enc(slug)}/fan-eligibility`)),
    notify: (slug: string) => call(z.object({ subscribed: z.boolean() }), http.post(`/events/${enc(slug)}/notify`, { channel: "sms" })),
    presale: (slug: string, code: string) =>
      call(z.object({ valid: z.boolean(), code: z.string(), message: z.string() }), http.post(`/events/${enc(slug)}/presale`, { code })),
    alerts: () => call(z.array(alertSchema), http.get("/alerts")),

    signUp: (body: SignUpRequest) => call(signUpResponseSchema, http.post("/auth/signup", body)),
    resendCode: (verificationId: string) => call(z.object({ resendInSeconds: z.number() }), http.post("/auth/resend", { verificationId })),
    verify: (verificationId: string, code: string) => call(clientSessionSchema, http.post("/auth/verify", { verificationId, code })),
    login: (body: LoginRequest) => call(clientSessionSchema, http.post("/auth/login", body)),
    logout: () => call(z.unknown(), http.post("/auth/logout")),
    forgotPassword: (body: ForgotPasswordRequest) => call(signUpResponseSchema, http.post("/auth/password/forgot", body)),
    resetPassword: (body: ResetPasswordRequest) => call(clientSessionSchema, http.post("/auth/password/reset", body)),

    me,
    /** The signed-in user, or `null` when there's no valid session. */
    meOrNull: async () => {
      try {
        return await me();
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) return null;
        throw error;
      }
    },
    updatePreferences: (body: PreferencesRequest) => call(userSchema, http.put("/me/preferences", body)),
    linkFan: (body: LinkFanRequest) => call(fanSchema, http.post("/me/fans", body)),
    unlinkFan: (id: string) => call(z.unknown(), http.delete(`/me/fans/${enc(id)}`)),
    notifications: () => call(z.object({ items: z.array(notificationSchema), unread: z.number() }), http.get("/me/notifications")),
    markNotificationsRead: (ids?: string[]) => call(z.unknown(), http.post("/me/notifications/read", ids ? { ids } : {})),

    uploadFanIdDocuments: (body: { documentType: DocumentType; front: File; back?: File }) => {
      const form = new FormData();
      form.set("documentType", body.documentType);
      form.set("front", body.front);
      if (body.back) form.set("back", body.back);
      return call(fanIdExtractedSchema, http.post("/fan-id/documents", form, { timeout: 60_000 }));
    },
    submitFanId: (body: { scanId: string; selfie: File; confirmDetails: true }) => {
      const form = new FormData();
      form.set("scanId", body.scanId);
      form.set("confirmDetails", "true");
      form.set("selfie", body.selfie);
      return call(fanIdStatusSchema, http.post("/fan-id", form, { timeout: 60_000 }));
    },

    joinQueue: (eventId: string) => call(queueStatusSchema, http.post("/queue", { eventId })),
    queue: (id: string) => call(queueStatusSchema, http.get(`/queue/${enc(id)}`)),
    setQueueSms: (id: string, smsOptIn: boolean) => call(queueStatusSchema, http.patch(`/queue/${enc(id)}`, { smsOptIn })),
    leaveQueue: (id: string) => call(z.unknown(), http.delete(`/queue/${enc(id)}`)),

    createHold: (body: HoldRequest) => call(holdSchema, http.post("/holds", body)),
    hold: (id: string) => call(holdSchema, http.get(`/holds/${enc(id)}`)),
    releaseHold: (id: string) => call(z.unknown(), http.delete(`/holds/${enc(id)}`)),
    applyPromo: (holdId: string, code: string) => call(holdSchema, http.post(`/holds/${enc(holdId)}/promo`, { code })),
    createOrder: (body: CreateOrderRequest) => call(orderSchema, http.post("/orders", body)),
    order: (id: string) => call(orderSchema, http.get(`/orders/${enc(id)}`)),

    tickets: (scope: "upcoming" | "past" = "upcoming") => call(z.array(ticketSchema), http.get(`/tickets?scope=${scope}`)),
    ticket: (id: string) => call(ticketSchema, http.get(`/tickets/${enc(id)}`)),
    ticketQr: (id: string) => call(qrTokenSchema, http.get(`/tickets/${enc(id)}/qr`)),
    transfer: (id: string, body: TransferRequest) => call(transferSchema, http.post(`/tickets/${enc(id)}/transfer`, body)),
    transfers: () => call(transfersResponseSchema, http.get("/transfers")),
    acceptTransfer: (id: string) =>
      call(z.object({ transfer: transferSchema, ticket: ticketSchema }), http.post(`/transfers/${enc(id)}/accept`)),
    declineTransfer: (id: string) => call(transferSchema, http.post(`/transfers/${enc(id)}/decline`)),
    cancelTransfer: (id: string) => call(transferSchema, http.post(`/transfers/${enc(id)}/cancel`)),

    listings: () => call(z.array(resaleListingSchema), http.get("/resale/listings")),
    createListing: (body: ResaleListingRequest) => call(resaleListingSchema, http.post("/resale/listings", body)),
    withdrawListing: (id: string) => call(z.unknown(), http.delete(`/resale/listings/${enc(id)}`)),

    refundOptions: (orderId: string) => call(refundOptionsSchema, http.get(`/orders/${enc(orderId)}/refund-options`)),
    refunds: () => call(z.array(refundSchema), http.get("/refunds")),
    createRefund: (body: RefundRequestInput) => call(refundSchema, http.post("/refunds", body)),
    cancelRefund: (id: string) => call(refundSchema, http.post(`/refunds/${enc(id)}/cancel`)),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
export const endpoints = createEndpoints(defaultClient);
