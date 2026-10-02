import type { Metadata } from "next";
import { ForgotPasswordView } from "@/views/account-views";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return <ForgotPasswordView />;
}
