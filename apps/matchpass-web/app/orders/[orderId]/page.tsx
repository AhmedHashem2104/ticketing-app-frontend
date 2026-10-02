import type { Metadata } from "next";
import { requireSession } from "@/lib/server/api";
import { OrderView } from "@/views/order-views";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function Page({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  await requireSession(`/orders/${orderId}`);
  return <OrderView orderId={orderId} />;
}
