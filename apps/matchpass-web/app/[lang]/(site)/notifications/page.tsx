import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireFeature } from "@/lib/feature-flags/server";
import { requireSession } from "@/lib/server/api";
import { NotificationsView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Notifications"), robots: { index: false } });

export default async function Page() {
  await requireFeature("notificationCentre");
  await requireSession("/notifications");
  return <NotificationsView />;
}
