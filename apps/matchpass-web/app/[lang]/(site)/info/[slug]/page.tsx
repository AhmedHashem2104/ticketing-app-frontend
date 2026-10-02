import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { infoPagesFor } from "@/lib/content/info-pages";
import { getServerI18n, languageAlternates } from "@/lib/i18n/server";
import { InfoView } from "@/views/info-views";

export async function generateMetadata({ params }: PageProps<"/[lang]/info/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getServerI18n();
  const page = infoPagesFor(locale)[slug];
  return page
    ? { title: page.title, description: page.intro, alternates: languageAlternates(`/info/${slug}`, locale) }
    : { title: "Matchpass" };
}

export default async function Page({ params }: PageProps<"/[lang]/info/[slug]">) {
  const { slug } = await params;
  const { locale } = await getServerI18n();
  const page = infoPagesFor(locale)[slug];
  if (!page) notFound();
  return <InfoView page={page} slug={slug} />;
}
