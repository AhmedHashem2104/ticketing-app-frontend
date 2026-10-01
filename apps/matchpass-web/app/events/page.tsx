import type { Metadata } from "next";
import { EventsView } from "@/views/events-view";

export const metadata: Metadata = { title: "Matches, concerts & events" };

export default function Page() {
  return <EventsView />;
}
