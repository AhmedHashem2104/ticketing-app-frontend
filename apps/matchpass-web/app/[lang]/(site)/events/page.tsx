import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { EventsView } from "@/views/events-view";

export const generateMetadata = localizedMetadata({ title: msg("Matches, concerts & events") });

export default function Page() {
  return <EventsView />;
}
