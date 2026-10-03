"use client";

import { ErrorState, useI18n } from "@repo/design-system";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper p-6">
      <ErrorState title={t("Something went wrong")} message={t("An unexpected error occurred. Please try again.")} onRetry={reset} />
    </main>
  );
}
