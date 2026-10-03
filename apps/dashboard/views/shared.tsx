"use client";

import { ErrorState, LoadingState, useI18n } from "@repo/design-system";
import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api/client";

/** Loading and error states for a query; renders `children` with the data once it's there. */
export function QueryView<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  const { t } = useI18n();
  if (query.isPending) return <LoadingState label={t("Loading")} />;
  if (query.isError)
    return (
      <ErrorState
        message={errorMessage(query.error) ?? t("Something went wrong. Please try again.")}
        onRetry={() => void query.refetch()}
      />
    );
  return <>{children(query.data)}</>;
}

/** A value that follows `value` after the person stops typing (search boxes). */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
