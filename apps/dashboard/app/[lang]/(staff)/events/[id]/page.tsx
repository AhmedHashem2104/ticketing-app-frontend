import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { EventReportView } from "@/views/event-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/events/[id]">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Event report") };
}

export default function Page() {
  return <EventReportView />;
}
