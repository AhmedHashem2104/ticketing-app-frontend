import type { Metadata } from "next";
import { requireFeature } from "@/lib/feature-flags/server";
import { QueueView } from "@/views/queue-view";

export const metadata: Metadata = { title: "Waiting room" };

export default async function Page({ params }: PageProps<"/events/[slug]/queue">) {
  await requireFeature("waitingRoom");
  const { slug } = await params;
  return <QueueView slug={slug} />;
}
