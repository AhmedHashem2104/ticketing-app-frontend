import type { Metadata } from "next";
import { PurchaseView } from "@/views/purchase-view";

export const metadata: Metadata = { title: "Choose tickets" };

export default async function Page({ params }: PageProps<"/events/[slug]/tickets">) {
  const { slug } = await params;
  return <PurchaseView slug={slug} />;
}
