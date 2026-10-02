import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { AccountView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Your account"), robots: { index: false } });

export default async function Page() {
  await requireSession("/account");
  return <AccountView />;
}
