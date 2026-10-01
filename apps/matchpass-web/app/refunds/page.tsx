import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { RefundsView } from "@/views/aftercare-views";

export const metadata: Metadata = { title: "Refunds", robots: { index: false } };

export default async function Page() {
  await requireFeature("refunds");
  return <RefundsView />;
}
