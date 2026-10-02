import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { ForgotPasswordView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Reset your password"), robots: { index: false } });

export default function Page() {
  return <ForgotPasswordView />;
}
