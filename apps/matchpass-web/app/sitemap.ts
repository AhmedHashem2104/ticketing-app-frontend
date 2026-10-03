import { locales, localizePath } from "@repo/i18n";
import type { MetadataRoute } from "next";
import { INFO_PAGES } from "@/lib/content/info-pages";
import { serverApi, siteUrl } from "@/lib/server/api";

/** Public pages plus every event the API lists, in every language. Rebuilt on each request so new events appear immediately. */
export const dynamic = "force-dynamic";

type Entry = { path: string; changeFrequency: "daily" | "monthly"; priority: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [matches, concerts, cinema] = await Promise.all([
    serverApi.events({ tab: "matches" }, "en"),
    serverApi.events({ tab: "concerts" }, "en"),
    serverApi.events({ tab: "cinema" }, "en"),
  ]);
  const events = [...(matches?.items ?? []), ...(concerts?.items ?? []), ...(cinema?.items ?? [])];
  const entries: Entry[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/events?tab=matches", changeFrequency: "daily", priority: 0.9 },
    { path: "/events?tab=concerts", changeFrequency: "daily", priority: 0.9 },
    { path: "/events?tab=cinema", changeFrequency: "daily", priority: 0.6 },
    ...events.map((e) => ({ path: `/events/${e.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...Object.keys(INFO_PAGES).map((slug) => ({ path: `/info/${slug}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  // One URL per language, each listing its translations (hreflang) so search engines serve the right one.
  return entries.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${base}${localizePath(path, locale)}`,
      changeFrequency,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}${localizePath(path, l)}`])) },
    })),
  );
}
