import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { RequestsView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/requests">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Change requests") };
}

export default function Page() {
  return <RequestsView />;
}
