import type { EventSummary, Ticket } from "@repo/contracts";

/** Typed route builders — the single source of truth for app URLs. */
export const routes = {
  home: "/",
  events: (tab: "matches" | "concerts" = "matches") => `/events?tab=${tab}`,
  event: (slug: string) => `/events/${slug}`,
  queue: (slug: string) => `/events/${slug}/queue`,
  tickets: (slug: string) => `/events/${slug}/tickets`,
  seats: (slug: string) => `/events/${slug}/seats`,
  cinema: "/cinema",
  checkout: (holdId: string) => `/checkout/${holdId}`,
  order: (orderId: string) => `/orders/${orderId}`,
  myTickets: "/tickets",
  ticket: (ticketId: string) => `/tickets/${ticketId}`,
  transfer: (ticketId: string) => `/tickets/${ticketId}?transfer=1`,
  resale: (ticketId?: string) => (ticketId ? `/resale?ticket=${ticketId}` : "/resale"),
  refunds: "/refunds",
  newRefund: (orderId: string) => `/refunds/new?order=${orderId}`,
  signUp: "/signup",
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : "/login"),
  fanId: "/fan-id",
};

export const eventHref = (event: Pick<EventSummary, "slug" | "kind">) =>
  event.kind === "cinema" ? routes.tickets(event.slug) : routes.event(event.slug);

export const ticketGroupKey = (ticket: Ticket) => ticket.orderId;
