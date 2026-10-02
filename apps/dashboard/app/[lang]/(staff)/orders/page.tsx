import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { OrdersView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/orders">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Orders") };
}

export default function Page() {
  return <OrdersView />;
}
