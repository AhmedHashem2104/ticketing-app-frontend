"use client";

import { localizePath } from "@repo/i18n";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useRouteLocale } from "./route-locale";

/**
 * `useRouter()` that keeps the visitor in their language: `push("/tickets")` goes to `/ar/tickets` on an
 * Arabic page. Paths that already carry a locale, API paths and external URLs are left as they are.
 */
export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useRouteLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizePath(href, locale), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(href, locale), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizePath(href, locale), options),
    }),
    [router, locale],
  );
}
