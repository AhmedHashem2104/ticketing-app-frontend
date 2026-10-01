import type { Metadata } from "next";
import { OrderView } from "@/views/order-views";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function Page({ params }: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  return <OrderView orderId={orderId} />;
}
