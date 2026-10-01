import type { Metadata } from "next";
import { CheckoutView } from "@/views/order-views";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Page({ params }: PageProps<"/checkout/[holdId]">) {
  const { holdId } = await params;
  return <CheckoutView holdId={holdId} />;
}
