import { arCatalog, createTranslator, directionOf, htmlLangOf, isLocale, locales } from "@repo/i18n";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";
import { WebVitals } from "@/components/web-vitals";
import { getFeatureFlags } from "@/lib/feature-flags/server";
import { appCatalog } from "@/lib/i18n/catalog";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const t = createTranslator(locale, appCatalog, arCatalog);
  return {
    title: { default: t("Matchpass — Official tickets for matches, concerts & events"), template: t("%s · Matchpass") },
    description: t("Official tickets for football, concerts and live events in Egypt. Fan ID, waiting rooms, official resale and refunds."),
    applicationName: "Matchpass",
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    alternates: { languages: { en: "/en", ar: "/ar", "x-default": "/en" } },
    openGraph: { type: "website", siteName: "Matchpass", locale: locale === "ar" ? "ar_EG" : "en_EG" },
    twitter: { card: "summary" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0E4D2F",
  width: "device-width",
  initialScale: 1,
};

/** Root layout for every page, under the language segment: `/en/...` or `/ar/...` (right-to-left). */
export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const flags = await getFeatureFlags();
  return (
    <html lang={htmlLangOf(lang)} dir={directionOf(lang)}>
      <body>
        <WebVitals />
        {/* Keyed by language so each language gets its own query cache (API content is localized). */}
        <Providers key={lang} flags={flags}>
          {/* No Suspense boundary here: an unknown path must hit notFound() before streaming starts, so it gets a real 404. */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
