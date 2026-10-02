import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { serverApi } from "@/lib/server/api";
import { ResaleMarketView } from "@/views/aftercare-views";

export async function generateMetadata({ params }: PageProps<"/events/[slug]/resale">): Promise<Metadata> {
  const { slug } = await params;
  const event = await serverApi.event(slug);
  return { title: event ? `Official resale · ${event.title}` : "Official resale" };
}

export default async function Page({ params }: PageProps<"/events/[slug]/resale">) {
  await requireFeature("resale");
  const { slug } = await params;
  return <ResaleMarketView slug={slug} />;
}
