"use client";

import { isLocale, type Locale } from "@repo/i18n";
import { useParams } from "next/navigation";

/** The language of the current route (`/ar/...`), read from the `[lang]` segment. English outside it. */
export function useRouteLocale(): Locale {
  const params = useParams<{ lang?: string }>();
  return isLocale(params?.lang) ? params.lang : "en";
}
