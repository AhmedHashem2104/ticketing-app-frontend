import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { EventsView } from "@/views/event-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/events">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Events") };
}

export default function Page() {
  return <EventsView />;
}
