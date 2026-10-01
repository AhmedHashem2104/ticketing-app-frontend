import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { ResaleView } from "@/views/aftercare-views";

export const metadata: Metadata = { title: "Official resale" };

export default async function Page() {
  await requireFeature("resale");
  return <ResaleView />;
}
