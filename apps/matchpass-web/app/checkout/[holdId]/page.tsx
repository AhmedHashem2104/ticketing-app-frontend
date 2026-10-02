import type { Metadata } from "next";
import { requireSession } from "@/lib/server/api";
import { CheckoutView } from "@/views/order-views";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Page({ params }: PageProps<"/checkout/[holdId]">) {
  const { holdId } = await params;
  await requireSession(`/checkout/${holdId}`);
  return <CheckoutView holdId={holdId} />;
}
