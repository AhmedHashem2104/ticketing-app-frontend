"use client";

import { configureUI, UIProvider, type LinkComponentProps } from "@repo/design-system";
import { localizePath } from "@repo/i18n";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState, type ReactNode } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { HydrateFeatureFlags } from "@/lib/feature-flags/client";
import { appCatalog } from "@/lib/i18n/catalog";
import { useRouteLocale } from "@/lib/i18n/route-locale";
import type { FeatureFlags } from "@/lib/feature-flags/schema";

/** Next.js link that keeps the visitor in their language: `/tickets` → `/ar/tickets`. */
function AppLink({ href, prefetch, ...props }: LinkComponentProps) {
  const locale = useRouteLocale();
  return <NextLink href={localizePath(href, locale)} prefetch={prefetch} {...props} />;
}

// Same for every request, so it's set once when the module loads (server and browser).
configureUI({
  LinkComponent: AppLink,
  useLocale: useRouteLocale,
  catalogs: [appCatalog],
  devTools: process.env.NODE_ENV === "development",
});

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Don't hammer the API for errors a retry can't fix.
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache(),
  });
}

export function Providers({ flags, children }: { flags: FeatureFlags; children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <HydrateFeatureFlags flags={flags}>
      <QueryClientProvider client={queryClient}>
        <UIProvider>{children}</UIProvider>
      </QueryClientProvider>
    </HydrateFeatureFlags>
  );
}
