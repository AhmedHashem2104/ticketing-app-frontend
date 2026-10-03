"use client";

import { Container, ErrorState, LoadingState, MessagePage, SiteLayout, useI18n } from "@repo/design-system";
import { msg } from "@repo/i18n";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppFooter, AppHeader, type NavId } from "@/components/app-chrome";
import { ApiRequestError, toApiError } from "@/lib/api/client";
import { routes } from "@/lib/routes";

export function PageLoading({ active, label }: { active?: NavId; label?: string }) {
  const { t } = useI18n();
  label ??= t("Loading");
  return (
    <SiteLayout header={<AppHeader active={active} />}>
      <LoadingState label={label} className="min-h-[50vh]" />
    </SiteLayout>
  );
}

export function PageError({ error, onRetry, active }: { error: unknown; onRetry?: () => void; active?: NavId }) {
  const apiError = toApiError(error);
  const { t } = useI18n();
  if (apiError.status === 404) {
    return (
      <MessagePage
        header={<AppHeader active={active} />}
        footer={<AppFooter />}
        code="404"
        title={t("We couldn't find that")}
        body={t("It may have been removed, or the link might be wrong.")}
        action={{ label: t("Browse events"), href: routes.events() }}
      />
    );
  }
  return (
    <SiteLayout header={<AppHeader active={active} />}>
      <Container className="pt-10">
        <ErrorState message={t(apiError.message)} onRetry={onRetry} />
      </Container>
    </SiteLayout>
  );
}

/** Renders loading and error pages for a query, then `children` with its data. */
export function QueryPage<T>({
  query,
  active,
  loadingLabel,
  children,
}: {
  query: UseQueryResult<T>;
  active?: NavId;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <PageLoading active={active} label={loadingLabel} />;
  if (query.isError) return <PageError error={query.error} onRetry={() => void query.refetch()} active={active} />;
  return <>{children(query.data)}</>;
}

export const isApiError = (error: unknown, code: string) => error instanceof ApiRequestError && error.code === code;

const AUTH_BRAND = {
  title: msg("One account for every match and every show"),
  bullets: [
    msg("Get alerts the moment your club or artist goes on sale"),
    msg("Pay with card, wallet, InstaPay or Fawry"),
    msg("Tickets on your phone — transfer or resell safely"),
  ],
};

/** The green brand panel beside the auth forms, in the visitor's language. */
export function useAuthBrand() {
  const { t } = useI18n();
  return { title: t(AUTH_BRAND.title), bullets: AUTH_BRAND.bullets.map((b) => t(b)) };
}
