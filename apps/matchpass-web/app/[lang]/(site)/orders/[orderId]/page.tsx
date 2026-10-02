import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { OrderView } from "@/views/order-views";

export const generateMetadata = localizedMetadata({ title: msg("Order confirmed"), robots: { index: false } });

export default async function Page({ params }: PageProps<"/[lang]/orders/[orderId]">) {
  const { orderId } = await params;
  await requireSession(`/orders/${orderId}`);
  return <OrderView orderId={orderId} />;
}
