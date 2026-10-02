import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireFeature } from "@/lib/feature-flags/server";
import { StadiumSeatsView } from "@/views/purchase-view";

export const generateMetadata = localizedMetadata({ title: msg("Pick your seats") });

export default async function Page({ params }: PageProps<"/[lang]/events/[slug]/seats">) {
  await requireFeature("exactSeatSelection");
  const { slug } = await params;
  return <StadiumSeatsView slug={slug} />;
}
