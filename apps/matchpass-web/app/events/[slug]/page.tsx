import { eventDetailSchema } from "@repo/contracts";
import type { Metadata } from "next";
import { EventView } from "@/views/event-view";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const response = await fetch(`${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/events/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { title: "Event" };
    const event = eventDetailSchema.parse(await response.json());
    return { title: event.title, description: `${event.headline}. Tickets from ${event.priceFrom} EGP on Matchpass.` };
  } catch {
    return { title: "Event" };
  }
}

export default async function Page({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  return <EventView slug={slug} />;
}
