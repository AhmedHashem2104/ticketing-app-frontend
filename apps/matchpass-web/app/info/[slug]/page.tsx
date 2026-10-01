import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INFO_PAGES, InfoView } from "@/views/info-views";

export async function generateMetadata({ params }: PageProps<"/info/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: INFO_PAGES[slug]?.title ?? "Matchpass" };
}

export default async function Page({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  if (!INFO_PAGES[slug]) notFound();
  return <InfoView slug={slug} />;
}
