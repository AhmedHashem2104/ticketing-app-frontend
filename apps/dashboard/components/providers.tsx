"use client";

import { configureUI, UIProvider, type LinkComponentProps } from "@repo/design-system";
import { localizePath } from "@repo/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState, type ReactNode } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { useRouteLocale } from "@/lib/i18n/route-locale";

/** Next.js link that keeps staff in their language: `/events` → `/ar/events`. */
function AppLink({ href, prefetch, ...props }: LinkComponentProps) {
  const locale = useRouteLocale();
  return <NextLink href={localizePath(href, locale)} prefetch={prefetch} {...props} />;
}

// The same for every request, so it's set once when the module loads (server and browser).
configureUI({
  LinkComponent: AppLink,
  useLocale: useRouteLocale,
  devTools: process.env.NODE_ENV === "development",
});

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  );
}
