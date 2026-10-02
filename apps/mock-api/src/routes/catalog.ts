import {
  eventsQuerySchema,
  notifyRequestSchema,
  presaleCodeRequestSchema,
  type Alert,
  type EventDetail,
  type EventSummary,
  type EventsResponse,
  type HomeResponse,
  type FanEligibility,
  type ResaleOffer,
} from "@repo/contracts";
import { Router } from "express";
import { HOME_LAYOUT } from "../data/catalog";
import { cinemaSeats, seatMapFor } from "../data/seating";
import type { Store } from "../data/store";
import { currentUser, optionalUser, requireAuth } from "../http/auth";
import { HttpError, notFound } from "../http/errors";
import { param, parseBody, parseQuery } from "../http/validate";

export const PRESALE_CODES: Record<string, string[]> = {
  "layla-nour-live-in-cairo": ["LAYLA24"],
  "cairo-jazz-nights": ["JAZZ24"],
};

export function toSummary(event: EventDetail): EventSummary {
  const {
    id,
    slug,
    kind,
    layout,
    category,
    title,
    subtitle,
    tag,
    art,
    theme,
    startsAt,
    endsAt,
    venue,
    priceFrom,
    status,
    statusLabel,
    requiresFanId,
    maxPerOrder,
    serviceFee,
    homeTeam,
    awayTeam,
  } = event;
  return {
    id,
    slug,
    kind,
    layout,
    category,
    title,
    tag,
    art,
    theme,
    startsAt,
    venue,
    priceFrom,
    status,
    statusLabel,
    requiresFanId,
    maxPerOrder,
    serviceFee,
    ...(subtitle ? { subtitle } : {}),
    ...(endsAt ? { endsAt } : {}),
    ...(homeTeam ? { homeTeam } : {}),
    ...(awayTeam ? { awayTeam } : {}),
  };
}

const isMatchTab = (event: EventDetail) => event.kind === "match";
const isConcertTab = (event: EventDetail) => event.kind !== "match" && event.kind !== "cinema";
const isCinemaTab = (event: EventDetail) => event.kind === "cinema";
const TAB_FILTERS = { matches: isMatchTab, concerts: isConcertTab, cinema: isCinemaTab };
const TAB_CATEGORIES = {
  matches: ["Premier League", "Cup", "National team", "African club competitions", "Women’s league"],
  concerts: ["Concerts", "Festivals", "Comedy", "Theatre", "Classical", "Family"],
  cinema: ["Cinema"],
};

/** Test-only: the organiser cancels an event (every live ticket is refunded automatically). */
export function catalogTestRoutes(store: Store) {
  const router = Router();
  router.post("/__test__/events/:slug/cancel", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    store.cancelEvent(event);
    res.json(event);
  });
  return router;
}

export function catalogRouter(store: Store) {
  const router = Router();
  const auth = requireAuth(store);

  router.get("/home", (_req, res) => {
    const pick = (ids: readonly string[]) => ids.map((id) => store.eventById(id)).filter((e): e is EventDetail => !!e);
    const body: HomeResponse = {
      featured: pick(HOME_LAYOUT.featured),
      onSale: pick(HOME_LAYOUT.onSale).map(toSummary),
      comingSoon: pick(HOME_LAYOUT.comingSoon).map(toSummary),
      categories: HOME_LAYOUT.categories,
    };
    res.json(body);
  });

  router.get("/events", (req, res) => {
    const query = parseQuery(eventsQuerySchema, req);
    const inTab = store.events.filter(TAB_FILTERS[query.tab]);
    const q = query.q?.toLowerCase();
    const items = inTab
      .filter((e) => !q || [e.title, e.venue.name, e.venue.area, e.tag].some((text) => text.toLowerCase().includes(q)))
      .filter((e) => !query.categories?.length || query.categories.includes(e.category))
      .filter((e) => !query.cities?.length || query.cities.includes(e.venue.city))
      .filter((e) => !query.from || e.startsAt.slice(0, 10) >= query.from)
      .filter((e) => !query.availableOnly || !["sold_out", "coming_soon", "cancelled", "postponed"].includes(e.status))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(toSummary);
    const body: EventsResponse = {
      items,
      total: items.length,
      facets: {
        categories: TAB_CATEGORIES[query.tab],
        cities: ["cairo", "alexandria", "canal", "red_sea"],
      },
    };
    res.json(body);
  });

  router.get("/events/:slug", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    res.json(event);
  });

  router.get("/events/:slug/seatmap", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    if (event.status === "coming_soon") throw new HttpError("FORBIDDEN", "Tickets for this event aren't on sale yet");
    if (event.status === "cancelled") throw new HttpError("CONFLICT", "This event has been cancelled");
    // Seats in other fans' active holds show as taken; the viewer's own hold stays selectable.
    res.json(seatMapFor(event, store.unavailable(event.id, optionalUser(store, req)?.id), store.now()));
  });

  router.get("/events/:slug/showtimes/:showtimeId/seats", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event || event.layout !== "cinema") throw notFound("Cinema event");
    const id = param(req, "showtimeId");
    const seats = cinemaSeats(id, store.unavailable(`${event.id}:${id}`, optionalUser(store, req)?.id));
    if (!seats) throw notFound("Showtime");
    res.json(seats);
  });

  router.post("/events/:slug/notify", auth, (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    const { channel } = parseBody(notifyRequestSchema, req);
    store.subscriptions.add(`${currentUser(res).id}:${event.id}`);
    res.status(201).json({ subscribed: true, channel, eventId: event.id });
  });

  router.post("/events/:slug/presale", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    if (!event.presaleCodeEnabled) throw new HttpError("INVALID_CODE", "This event has no presale");
    const { code } = parseBody(presaleCodeRequestSchema, req);
    if (!PRESALE_CODES[event.slug]?.includes(code)) throw new HttpError("INVALID_CODE", "That presale code isn't valid for this event");
    res.json({ valid: true, code, message: "Presale unlocked — you can buy before general sale." });
  });

  /** Which of the signed-in fan's linked Fan IDs can still get a ticket for this event. */
  router.get("/events/:slug/fan-eligibility", auth, (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    const user = store.refreshUser(currentUser(res));
    const taken = event.kind === "match" ? store.fanNumbersWithTickets(event.id) : new Set<string>();
    const body: FanEligibility[] = user.fans.map((fan) =>
      fan.status !== "approved"
        ? { fanId: fan.id, eligible: false, reason: "Fan ID under review" }
        : fan.number && taken.has(fan.number)
          ? { fanId: fan.id, eligible: false, reason: "Already has a ticket for this match" }
          : { fanId: fan.id, eligible: true },
    );
    res.json(body);
  });

  /** Official resale marketplace: tickets other fans are selling at or below face value. */
  router.get("/events/:slug/resale", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    const viewer = optionalUser(store, req);
    store.purgeExpiredHolds();
    const inCheckout = new Set([...store.holds.values()].map((h) => h.listingId).filter(Boolean));
    const offers: ResaleOffer[] = [...store.listings.values()]
      .filter((l) => l.eventId === event.id && l.status === "listed" && l.userId !== viewer?.id && !inCheckout.has(l.id))
      .sort((a, b) => a.price - b.price)
      .map((l) => ({
        id: l.id,
        eventId: event.id,
        label: event.kind === "match" ? `Fan resale · ${l.seatLabel.split(" · ")[0]}` : "Fan resale",
        seatLabel: l.seatLabel,
        price: l.price,
        faceValue: l.faceValue,
        requiresFanId: event.requiresFanId,
      }));
    res.json(offers);
  });

  router.get("/alerts", auth, (_req, res) => {
    const user = currentUser(res);
    const mine = [...store.tickets.values()].filter((t) => t.userId === user.id);
    const alerts: Alert[] = [];
    for (const transfer of store.transfers.values()) {
      store.refreshTransfer(transfer);
      if (transfer.toUserId === user.id && transfer.status === "pending") {
        alerts.push({
          id: `alert_${transfer.id}`,
          tone: "info",
          title: `${transfer.fromName} sent you a ticket for ${transfer.eventTitle}.`,
          body: "Accept it within 24 hours or it goes back to them.",
          action: { label: "Review ticket", href: "/transfers" },
        });
      }
    }
    for (const event of store.events.filter((e) => e.status === "cancelled")) {
      if (mine.some((t) => t.eventId === event.id)) {
        alerts.push({
          id: `alert_cancelled_${event.id}`,
          tone: "danger",
          title: `${event.title} has been cancelled.`,
          body: "Your tickets were refunded in full, including fees. You don't need to do anything.",
          action: { label: "See refund", href: "/refunds" },
        });
      }
    }
    if (mine.some((t) => t.eventSlug === "delta-sc-vs-red-sea-fc")) {
      alerts.push({
        id: "alert_postponed",
        tone: "warning",
        title: "Delta SC vs Red Sea FC has been postponed.",
        body: "Keep your tickets for the new date, or get a full refund — including fees — within 7 days.",
        action: { label: "See refund", href: "/refunds" },
      });
    }
    res.json(alerts);
  });

  return router;
}
