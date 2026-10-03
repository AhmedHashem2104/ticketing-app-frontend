import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { PurchaseView } from "@/views/purchase-view";

export const generateMetadata = localizedMetadata({ title: msg("Choose tickets") });

export default async function Page({ params }: PageProps<"/[lang]/events/[slug]/tickets">) {
  const { slug } = await params;
  return <PurchaseView slug={slug} />;
}
