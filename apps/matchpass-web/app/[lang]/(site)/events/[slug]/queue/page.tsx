import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireFeature } from "@/lib/feature-flags/server";
import { QueueView } from "@/views/queue-view";

export const generateMetadata = localizedMetadata({ title: msg("Waiting room") });

export default async function Page({ params }: PageProps<"/[lang]/events/[slug]/queue">) {
  await requireFeature("waitingRoom");
  const { slug } = await params;
  return <QueueView slug={slug} />;
}
