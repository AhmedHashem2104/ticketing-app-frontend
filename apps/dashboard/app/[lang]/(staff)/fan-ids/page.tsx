import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { FanIdsView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/fan-ids">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Fan ID reviews") };
}

export default function Page() {
  return <FanIdsView />;
}
