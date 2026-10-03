"use client";

import { useI18n } from "@repo/design-system";
import { localizePath } from "@repo/i18n";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Switches the dashboard between English and Arabic on the same page. A full navigation, so the server
 * renders the new `<html lang dir>` and the proxy remembers the choice.
 */
export function LanguageSwitch() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "ar" ? "en" : "ar";
  const href = localizePath(`${pathname}${search.size ? `?${search.toString()}` : ""}`, target);
  return (
    <a
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={target === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-line bg-white px-3 text-base font-semibold text-ink no-underline"
    >
      {target === "ar" ? "ع" : "EN"}
    </a>
  );
}
