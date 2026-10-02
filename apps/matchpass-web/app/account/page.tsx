import type { Metadata } from "next";
import { requireSession } from "@/lib/server/api";
import { AccountView } from "@/views/account-views";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Page() {
  await requireSession("/account");
  return <AccountView />;
}
