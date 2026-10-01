import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { FanIdView } from "@/views/account-views";

export const metadata: Metadata = { title: "Fan ID" };

export default async function Page() {
  await requireFeature("fanId");
  return <FanIdView />;
}
