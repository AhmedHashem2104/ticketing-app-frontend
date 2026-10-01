import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { StadiumSeatsView } from "@/views/purchase-view";

export const metadata: Metadata = { title: "Pick your seats" };

export default async function Page({ params }: PageProps<"/events/[slug]/seats">) {
  await requireFeature("exactSeatSelection");
  const { slug } = await params;
  return <StadiumSeatsView slug={slug} />;
}
