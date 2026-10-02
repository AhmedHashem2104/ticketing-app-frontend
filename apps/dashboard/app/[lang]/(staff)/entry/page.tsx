import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { EntryView } from "@/views/event-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/entry">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Entry") };
}

/** `?event=` opens the scanner on that event (linked from an event's report). */
export default async function Page({ searchParams }: PageProps<"/[lang]/entry">) {
  const { event } = await searchParams;
  return <EntryView initialEventId={typeof event === "string" ? event : undefined} />;
}
