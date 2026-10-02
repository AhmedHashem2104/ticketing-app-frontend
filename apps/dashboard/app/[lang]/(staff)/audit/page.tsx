import { arCatalog, createTranslator, isLocale } from "@repo/i18n";
import type { Metadata } from "next";
import { AuditView } from "@/views/desk-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/audit">): Promise<Metadata> {
  const { lang } = await params;
  return { title: createTranslator(isLocale(lang) ? lang : "en", arCatalog)("Audit log") };
}

export default function Page() {
  return <AuditView />;
}
