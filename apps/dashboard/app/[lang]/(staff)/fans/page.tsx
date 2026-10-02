import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { FansView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/fans">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Fans") };
}

export default function Page() {
  return <FansView />;
}
