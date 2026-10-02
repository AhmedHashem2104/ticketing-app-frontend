import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { SignUpView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Create your account") });

export default function Page() {
  return <SignUpView />;
}
