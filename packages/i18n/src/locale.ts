/** Languages Matchpass ships in. English is the source language; Arabic is right-to-left. */
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that remembers the fan's language for unprefixed URLs (e.g. links in SMS). */
export const LOCALE_COOKIE = "mp_locale";

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && (locales as readonly string[]).includes(value);

export const directionOf = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");

/** BCP 47 tag for `<html lang>` and `Intl`. Arabic uses Egyptian conventions with Latin digits (codes, seats and prices stay readable). */
export const htmlLangOf = (locale: Locale) => (locale === "ar" ? "ar-EG" : "en");

export const intlLocaleOf = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

/** Each language named in itself — used by the language switcher. */
export const localeNames: Record<Locale, string> = { en: "English", ar: "العربية" };

/**
 * Picks the best supported locale from an `Accept-Language` header (quality values respected).
 * Unknown or missing headers fall back to English.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined, fallback: Locale = defaultLocale): Locale {
  if (!acceptLanguage) return fallback;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((entry) => entry.base && !Number.isNaN(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.map((entry) => entry.base).find(isLocale) ?? fallback;
}
