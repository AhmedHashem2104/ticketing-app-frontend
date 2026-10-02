import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { LoginView } from "@/views/account-views";

export const generateMetadata = localizedMetadata({ title: msg("Log in") });

export default function Page() {
  return <LoginView />;
}
