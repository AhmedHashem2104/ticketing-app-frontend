"use client";

import { UIProvider, type LinkComponentProps } from "@repo/design-system";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState, type ReactNode } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { FeatureFlagsProvider } from "@/lib/feature-flags/client";
import type { FeatureFlags } from "@/lib/feature-flags/schema";

function AppLink({ href, prefetch, ...props }: LinkComponentProps) {
  return <NextLink href={href} prefetch={prefetch} {...props} />;
}

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
    <FeatureFlagsProvider flags={flags}>
      <QueryClientProvider client={queryClient}>
        <UIProvider linkComponent={AppLink}>{children}</UIProvider>
      </QueryClientProvider>
    </FeatureFlagsProvider>
  );
}
