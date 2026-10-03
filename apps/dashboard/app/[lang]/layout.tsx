import { arCatalog, createTranslator, directionOf, htmlLangOf, isLocale } from "@repo/i18n";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Providers } from "@/components/providers";
import "../globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = createTranslator(isLocale(lang) ? lang : "en", arCatalog);
  return {
    title: { default: t("Matchpass staff dashboard"), template: t("%s · Matchpass staff") },
    applicationName: "Matchpass",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#121512", width: "device-width", initialScale: 1 };

/**
 * Root layout for every dashboard page, under the language segment: `/en/...` or `/ar/...` (right-to-left).
 *
 * Every page is rendered per request (`connection()`): the Content Security Policy uses a fresh nonce per
 * request, which Next.js can only stamp on its scripts at request time — a page prerendered at build time
 * would have its scripts blocked. Staff pages are private and per-person anyway, so nothing is lost.
 */
export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  await connection();
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={htmlLangOf(lang)} dir={directionOf(lang)}>
      <body>
        {/* Keyed by language so each language gets its own query cache (API content is localized). */}
        <Providers key={lang}>{children}</Providers>
      </body>
    </html>
  );
}
