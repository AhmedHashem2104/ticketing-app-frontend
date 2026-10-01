import {
  eventsQuerySchema,
  notifyRequestSchema,
  presaleCodeRequestSchema,
  type Alert,
  type EventDetail,
  type EventSummary,
  type EventsResponse,
  type HomeResponse,
} from "@repo/contracts";
import { Router } from "express";
import { HOME_LAYOUT } from "../data/catalog";
import { cinemaSeats, seatMapFor } from "../data/seating";
import type { Store } from "../data/store";
import { currentUser, requireAuth } from "../http/auth";
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
    const inTab = store.events.filter(query.tab === "matches" ? isMatchTab : isConcertTab);
    const q = query.q?.toLowerCase();
    const items = inTab
      .filter((e) => !q || [e.title, e.venue.name, e.venue.area, e.tag].some((text) => text.toLowerCase().includes(q)))
      .filter((e) => !query.categories?.length || query.categories.includes(e.category))
      .filter((e) => !query.cities?.length || query.cities.includes(e.venue.city))
      .filter((e) => !query.from || e.startsAt.slice(0, 10) >= query.from)
      .filter((e) => !query.availableOnly || !["sold_out", "coming_soon"].includes(e.status))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(toSummary);
    const body: EventsResponse = {
      items,
      total: items.length,
      facets: {
        categories:
          query.tab === "matches"
            ? ["Premier League", "Cup", "National team", "African club competitions", "Women’s league"]
            : ["Concerts", "Festivals", "Comedy", "Theatre", "Classical", "Family"],
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
    res.json(seatMapFor(event, store.soldFor(event.id), store.now()));
  });

  router.get("/events/:slug/showtimes/:showtimeId/seats", (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event || event.layout !== "cinema") throw notFound("Cinema event");
    const id = param(req, "showtimeId");
    const seats = cinemaSeats(id, store.soldFor(`${event.id}:${id}`));
    if (!seats) throw notFound("Showtime");
    res.json(seats);
  });

  router.post("/events/:slug/notify", auth, (req, res) => {
    const event = store.eventBySlug(param(req, "slug"));
    if (!event) throw notFound("Event");
    const { channel } = parseBody(notifyRequestSchema, req);
    store.notifications.add(`${currentUser(res).id}:${event.id}`);
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

  router.get("/alerts", auth, (_req, res) => {
    const user = currentUser(res);
    const hasPostponed = [...store.tickets.values()].some((t) => t.userId === user.id && t.eventSlug === "delta-sc-vs-red-sea-fc");
    const alerts: Alert[] = hasPostponed
      ? [
          {
            id: "alert_postponed",
            tone: "warning",
            title: "Delta SC vs Red Sea FC has been postponed.",
            body: "Keep your tickets for the new date, or get a full refund — including fees — within 7 days.",
            action: { label: "See refund", href: "/refunds" },
          },
        ]
      : [];
    res.json(alerts);
  });

  return router;
}
