import type { Metadata } from "next";
import { requireSession } from "@/lib/server/api";
import { requireFeature } from "@/lib/feature-flags/server";
import { RefundRequestView } from "@/views/aftercare-views";

export const metadata: Metadata = { title: "Request a refund", robots: { index: false } };

export default async function Page() {
  await requireFeature("refunds");
  await requireSession("/refunds/new");
  return <RefundRequestView />;
}
