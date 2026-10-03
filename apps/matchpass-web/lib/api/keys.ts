import type { EventsQuery } from "@repo/contracts";

/** Centralised TanStack Query keys so invalidation stays consistent. */
export const queryKeys = {
  home: ["home"] as const,
  events: (params: EventsQuery) => ["events", params] as const,
  event: (slug: string) => ["event", slug] as const,
  seatMap: (slug: string) => ["event", slug, "seatmap"] as const,
  cinemaSeats: (slug: string, showtimeId: string) => ["event", slug, "showtime", showtimeId] as const,
  alerts: ["alerts"] as const,
  me: ["me"] as const,
  queue: (id: string) => ["queue", id] as const,
  hold: (id: string) => ["hold", id] as const,
  order: (id: string) => ["order", id] as const,
  tickets: (scope: "upcoming" | "past" = "upcoming") => ["tickets", scope] as const,
  ticket: (id: string) => ["ticket", id] as const,
  listings: ["listings"] as const,
  refundOptions: (orderId: string) => ["refund-options", orderId] as const,
  refunds: ["refunds"] as const,
  ticketQr: (id: string) => ["ticket", id, "qr"] as const,
  transfers: ["transfers"] as const,
  notifications: ["notifications"] as const,
  resaleOffers: (slug: string) => ["event", slug, "resale"] as const,
  fanEligibility: (slug: string) => ["event", slug, "fan-eligibility"] as const,
};
