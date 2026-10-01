import type { Metadata } from "next";
import { SignUpView } from "@/views/account-views";

export const metadata: Metadata = { title: "Create your account" };

export default function Page() {
  return <SignUpView />;
}
