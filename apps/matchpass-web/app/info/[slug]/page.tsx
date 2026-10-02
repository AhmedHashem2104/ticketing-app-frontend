import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INFO_PAGES } from "@/lib/content/info-pages";
import { InfoView } from "@/views/info-views";

export async function generateMetadata({ params }: PageProps<"/info/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  return page ? { title: page.title, description: page.intro, alternates: { canonical: `/info/${slug}` } } : { title: "Matchpass" };
}

export default async function Page({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  const page = INFO_PAGES[slug];
  if (!page) notFound();
  return <InfoView page={page} slug={slug} />;
}
