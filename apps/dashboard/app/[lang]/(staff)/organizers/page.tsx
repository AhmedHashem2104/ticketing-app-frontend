import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { OrganizersView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/organizers">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Organisers") };
}

export default function Page() {
  return <OrganizersView />;
}
