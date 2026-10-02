import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { MyTicketsView } from "@/views/ticket-views";

export const generateMetadata = localizedMetadata({ title: msg("My tickets"), robots: { index: false } });

export default async function Page() {
  await requireSession("/tickets");
  return <MyTicketsView />;
}
