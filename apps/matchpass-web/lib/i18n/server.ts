import "server-only";
import { arCatalog, createFormatters, createTranslator, localizePath, type Locale } from "@repo/i18n";
import type { Metadata } from "next";
import { currentLocale } from "@/lib/server/api";
import { appCatalog } from "./catalog";

/** Translator and formatters for the current request's language (server components, metadata). */
export async function getServerI18n() {
  const locale = await currentLocale();
  return { locale, t: createTranslator(locale, appCatalog, arCatalog), f: createFormatters(locale) };
}

/** hreflang links for a page that exists in both languages. */
export const languageAlternates = (path: string, locale: Locale) => ({
  canonical: localizePath(path, locale),
  languages: { en: localizePath(path, "en"), ar: localizePath(path, "ar"), "x-default": localizePath(path, "en") },
});

/**
 * `generateMetadata` for pages with a fixed title: the title (marked with `msg()`) is translated into
 * the page's language. Other metadata is passed through.
 */
export function localizedMetadata({ title, ...rest }: Omit<Metadata, "title"> & { title: string }) {
  return async function generateMetadata(): Promise<Metadata> {
    const { t } = await getServerI18n();
    return { ...rest, title: t(title) };
  };
}
