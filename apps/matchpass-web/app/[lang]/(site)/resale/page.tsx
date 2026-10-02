import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { requireFeature } from "@/lib/feature-flags/server";
import { ResaleView } from "@/views/aftercare-views";

export const generateMetadata = localizedMetadata({ title: msg("Official resale") });

export default async function Page() {
  await requireFeature("resale");
  await requireSession("/resale");
  return <ResaleView />;
}
