import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { RefundsView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/refunds">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Refunds") };
}

export default function Page() {
  return <RefundsView />;
}
