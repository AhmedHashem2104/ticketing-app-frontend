import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { PayoutsView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/payouts">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Payouts") };
}

export default function Page() {
  return <PayoutsView />;
}
