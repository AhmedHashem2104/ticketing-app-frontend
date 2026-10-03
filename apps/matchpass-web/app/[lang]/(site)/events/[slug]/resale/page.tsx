import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { getServerI18n } from "@/lib/i18n/server";
import { serverApi } from "@/lib/server/api";
import { ResaleMarketView } from "@/views/aftercare-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/events/[slug]/resale">): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getServerI18n();
  const event = await serverApi.event(slug);
  return { title: event ? `${t("Official resale")} · ${event.title}` : t("Official resale") };
}

export default async function Page({ params }: PageProps<"/[lang]/events/[slug]/resale">) {
  await requireFeature("resale");
  const { slug } = await params;
  return <ResaleMarketView slug={slug} />;
}
