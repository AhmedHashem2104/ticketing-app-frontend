import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { requireSession } from "@/lib/server/api";
import { TransfersView } from "@/views/ticket-views";

export const metadata: Metadata = { title: "Ticket transfers", robots: { index: false } };

export default async function Page() {
  await requireFeature("ticketTransfer");
  await requireSession("/transfers");
  return <TransfersView />;
}
