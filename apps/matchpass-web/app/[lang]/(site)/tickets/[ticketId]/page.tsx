import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { TicketWalletView } from "@/views/ticket-views";

export const generateMetadata = localizedMetadata({ title: msg("Ticket QR"), robots: { index: false } });

export default async function Page({ params }: PageProps<"/[lang]/tickets/[ticketId]">) {
  const { ticketId } = await params;
  await requireSession(`/tickets/${ticketId}`);
  return <TicketWalletView ticketId={ticketId} />;
}
