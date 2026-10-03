import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { requireFeature } from "@/lib/feature-flags/server";
import { RefundsView } from "@/views/aftercare-views";

export const generateMetadata = localizedMetadata({ title: msg("Refunds"), robots: { index: false } });

export default async function Page() {
  await requireFeature("refunds");
  await requireSession("/refunds");
  return <RefundsView />;
}
