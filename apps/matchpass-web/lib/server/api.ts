import "server-only";
import { eventDetailSchema, eventsResponseSchema, homeResponseSchema, type EventDetail, type EventsQuery } from "@repo/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { z } from "zod";
import { SESSION_COOKIE } from "./session-cookie";

/** Server-side reads straight from the API (no BFF hop) for SSR, metadata, JSON-LD and the sitemap. */
const origin = () => (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");

async function get<S extends z.ZodType>(schema: S, path: string, timeoutMs = 4_000): Promise<z.output<S> | null> {
  try {
    const response = await fetch(`${origin()}/api${path}`, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    return schema.parse(await response.json());
  } catch {
    // SSR is an optimisation: if the API is slow or down the page still renders and the client retries.
    return null;
  }
}

export const serverApi = {
  home: cache(() => get(homeResponseSchema, "/home")),
  event: cache((slug: string) => get(eventDetailSchema, `/events/${encodeURIComponent(slug)}`)),
  events: (query: EventsQuery) => {
    const search = new URLSearchParams();
    if (query.tab) search.set("tab", query.tab);
    return get(eventsResponseSchema, `/events?${search.toString()}`);
  },
};

/** Sends visitors without a session cookie to log in before any protected page renders. */
export async function requireSession(nextPath: string) {
  const store = await cookies();
  if (!store.has(SESSION_COOKIE)) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export const siteUrl = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** schema.org Event markup so search engines can show dates, venue and prices. */
export function eventJsonLd(event: EventDetail) {
  const status: Record<string, string> = {
    cancelled: "https://schema.org/EventCancelled",
    postponed: "https://schema.org/EventPostponed",
  };
  return {
    "@context": "https://schema.org",
    "@type": event.kind === "match" ? "SportsEvent" : event.kind === "cinema" ? "ScreeningEvent" : "MusicEvent",
    name: event.title,
    description: event.headline,
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventStatus: status[event.status] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue.name,
      address: { "@type": "PostalAddress", addressLocality: event.venue.area, addressCountry: "EG" },
    },
    ...(event.homeTeam && event.awayTeam
      ? { homeTeam: { "@type": "SportsTeam", name: event.homeTeam.name }, awayTeam: { "@type": "SportsTeam", name: event.awayTeam.name } }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/events/${event.slug}`,
      price: event.priceFrom,
      priceCurrency: "EGP",
      availability:
        event.status === "sold_out"
          ? "https://schema.org/SoldOut"
          : event.status === "coming_soon"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
    },
    organizer: { "@type": "Organization", name: "Matchpass", url: siteUrl() },
  };
}
