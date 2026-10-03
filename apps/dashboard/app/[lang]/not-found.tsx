"use client";

import { EmptyState, LinkButton, useI18n } from "@repo/design-system";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper p-6">
      <EmptyState
        title={t("Page not found")}
        action={
          <LinkButton href="/" size="lg">
            {t("Back to overview")}
          </LinkButton>
        }
      >
        {t("This page doesn't exist or has moved.")}
      </EmptyState>
    </main>
  );
}
