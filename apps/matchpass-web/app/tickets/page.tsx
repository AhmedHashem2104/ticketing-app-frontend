import type { Metadata } from "next";
import { MyTicketsView } from "@/views/ticket-views";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default function Page() {
  return <MyTicketsView />;
}
