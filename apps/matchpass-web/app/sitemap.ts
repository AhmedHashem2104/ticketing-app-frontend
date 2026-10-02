import type { MetadataRoute } from "next";
import { INFO_PAGES } from "@/lib/content/info-pages";
import { serverApi, siteUrl } from "@/lib/server/api";

/** Public pages plus every event the API lists. Rebuilt on each request so new events appear immediately. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [matches, concerts, cinema] = await Promise.all([
    serverApi.events({ tab: "matches" }),
    serverApi.events({ tab: "concerts" }),
    serverApi.events({ tab: "cinema" }),
  ]);
  const events = [...(matches?.items ?? []), ...(concerts?.items ?? []), ...(cinema?.items ?? [])];
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/events?tab=matches`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/events?tab=concerts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/events?tab=cinema`, changeFrequency: "daily", priority: 0.6 },
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...Object.keys(INFO_PAGES).map((slug) => ({ url: `${base}/info/${slug}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
