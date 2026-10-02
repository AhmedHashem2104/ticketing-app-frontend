import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireFeature } from "@/lib/feature-flags/server";
import { requireSession } from "@/lib/server/api";
import { TransfersView } from "@/views/ticket-views";

export const generateMetadata = localizedMetadata({ title: msg("Ticket transfers"), robots: { index: false } });

export default async function Page() {
  await requireFeature("ticketTransfer");
  await requireSession("/transfers");
  return <TransfersView />;
}
