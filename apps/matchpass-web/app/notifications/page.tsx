import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { requireSession } from "@/lib/server/api";
import { NotificationsView } from "@/views/account-views";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function Page() {
  await requireFeature("notificationCentre");
  await requireSession("/notifications");
  return <NotificationsView />;
}
