"use client";

import { useI18n } from "@repo/design-system";
import { localizePath, localeNames } from "@repo/i18n";
import { usePathname, useSearchParams } from "next/navigation";
import { useFeatureFlag } from "@/lib/feature-flags/client";

/**
 * Switches between English and Arabic on the same page. It's a full navigation (not a client-side
 * route change) so the new language's page, metadata and `<html lang dir>` are rendered fresh by the
 * server, and the proxy remembers the choice. Hidden while the `arabicLanguage` flag is off.
 */
export function useLanguageSwitch() {
  const enabled = useFeatureFlag("arabicLanguage");
  const { locale } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  if (!enabled) return undefined;
  const target = locale === "ar" ? "en" : "ar";
  const href = localizePath(`${pathname}${search.size ? `?${search.toString()}` : ""}`, target);
  return {
    href,
    label: target === "ar" ? "التبديل إلى العربية" : "Switch to English",
    glyph: target === "ar" ? "ع" : "EN",
    lang: target,
    name: localeNames[target],
    onToggle: () => window.location.assign(href),
  };
}

/** Stand-alone switch for pages without the site header (log in, sign up, password reset). */
export function LanguageSwitch() {
  const lang = useLanguageSwitch();
  if (!lang) return null;
  return (
    <a
      href={lang.href}
      hrefLang={lang.lang}
      lang={lang.lang}
      aria-label={lang.label}
      className="flex h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-white px-3 text-base font-semibold"
    >
      {lang.glyph}
    </a>
  );
}
