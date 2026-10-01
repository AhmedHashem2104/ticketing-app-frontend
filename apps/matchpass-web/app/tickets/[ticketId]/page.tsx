import type { Metadata } from "next";
import { TicketWalletView } from "@/views/ticket-views";

export const metadata: Metadata = { title: "Ticket QR", robots: { index: false } };

export default async function Page({ params }: PageProps<"/tickets/[ticketId]">) {
  const { ticketId } = await params;
  return <TicketWalletView ticketId={ticketId} />;
}
