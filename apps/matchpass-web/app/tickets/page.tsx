import type { Metadata } from "next";
import { requireSession } from "@/lib/server/api";
import { MyTicketsView } from "@/views/ticket-views";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default async function Page() {
  await requireSession("/tickets");
  return <MyTicketsView />;
}
