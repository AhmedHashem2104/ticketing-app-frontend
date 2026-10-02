"use client";

import { Container, ErrorState, Logo, useI18n } from "@repo/design-system";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Rendering errors caught here never reach window.onerror, so report them explicitly.
    try {
      const body = JSON.stringify({
        type: "client-error",
        message: error.message.slice(0, 1_000),
        digest: error.digest,
        path: window.location.pathname,
      });
      navigator.sendBeacon?.("/monitoring", new Blob([body], { type: "application/json" }));
    } catch {
      // Best effort.
    }
  }, [error]);
  const { t, locale } = useI18n();
  return (
    <main id="main" className="min-h-dvh bg-paper pt-10">
      <Container className="flex flex-col gap-6">
        {/* A plain anchor forces a full reload, recovering from a broken client state. */}
        <a href={`/${locale}`} aria-label={t("Matchpass home")} className="self-start">
          <Logo />
        </a>
        <ErrorState title={t("Something went wrong")} message={t("An unexpected error occurred. Please try again.")} onRetry={reset} />
      </Container>
    </main>
  );
}
