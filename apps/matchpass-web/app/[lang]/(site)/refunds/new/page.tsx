import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { requireFeature } from "@/lib/feature-flags/server";
import { RefundRequestView } from "@/views/aftercare-views";

export const generateMetadata = localizedMetadata({ title: msg("Request a refund"), robots: { index: false } });

export default async function Page() {
  await requireFeature("refunds");
  await requireSession("/refunds/new");
  return <RefundRequestView />;
}
