import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { queryKeys } from "@/lib/api/keys";
import { getServerI18n, languageAlternates } from "@/lib/i18n/server";
import { eventJsonLd, serverApi } from "@/lib/server/api";
import { EventView } from "@/views/event-view";

export async function generateMetadata({ params }: PageProps<"/[lang]/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { t, f, locale } = await getServerI18n();
  const event = await serverApi.event(slug);
  if (!event) return { title: t("Event") };
  const description = t("{headline}. Tickets from {price} on Matchpass.", { headline: event.headline, price: f.money(event.priceFrom) });
  return {
    title: event.title,
    description,
    alternates: languageAlternates(`/events/${event.slug}`, locale),
    openGraph: {
      type: "website",
      title: event.title,
      description,
      siteName: "Matchpass",
      locale: locale === "ar" ? "ar_EG" : "en_EG",
      ...(event.imageUrl ? { images: [event.imageUrl] } : {}),
    },
    twitter: { card: "summary", title: event.title, description },
  };
}

/** Server-renders the event (fast first paint, crawlable) and hands the data to the client cache. */
export default async function Page({ params }: PageProps<"/[lang]/events/[slug]">) {
  const { slug } = await params;
  const event = await serverApi.event(slug);
  const queryClient = new QueryClient();
  if (event) queryClient.setQueryData(queryKeys.event(slug), event);
  return (
    <>
      {event ? (
        <script
          type="application/ld+json"
          // JSON.stringify output is safe here once "<" is escaped, so a title can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(event)).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventView slug={slug} />
      </HydrationBoundary>
    </>
  );
}
