import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireFeature } from "@/lib/feature-flags/server";
import { FanIdView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Fan ID") });

export default async function Page() {
  await requireFeature("fanId");
  return <FanIdView />;
}
