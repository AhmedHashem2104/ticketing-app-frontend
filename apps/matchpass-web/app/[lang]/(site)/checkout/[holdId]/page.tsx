import { msg } from "@repo/i18n";
import { localizedMetadata } from "@/lib/i18n/server";
import { requireSession } from "@/lib/server/api";
import { CheckoutView } from "@/views/order-views";

export const generateMetadata = localizedMetadata({ title: msg("Checkout"), robots: { index: false } });

export default async function Page({ params }: PageProps<"/[lang]/checkout/[holdId]">) {
  const { holdId } = await params;
  await requireSession(`/checkout/${holdId}`);
  return <CheckoutView holdId={holdId} />;
}
