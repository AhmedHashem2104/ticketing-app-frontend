import type { Metadata } from "next";
import { LoginView } from "@/views/account-views";

export const metadata: Metadata = { title: "Log in" };

export default function Page() {
  return <LoginView />;
}
