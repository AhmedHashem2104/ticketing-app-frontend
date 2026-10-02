"use client";

import type { EventSummary } from "@repo/contracts";
import { HomePage, useI18n } from "@repo/design-system";
import { useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { useAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useHome, useNotify } from "@/lib/queries";
import { eventHref, routes } from "@/lib/routes";
import { QueryPage } from "./shared";
import { useLocalizedRouter } from "@/lib/i18n/navigation";

export function HomeView() {
  const home = useHome();
  const flags = useFeatureFlags();
  const auth = useAuth();
  const router = useLocalizedRouter();
  const notify = useNotify();
  const [category, setCategory] = useState("All");
  const { t } = useI18n();
  const [notified, setNotified] = useState<string[]>([]);

  const onNotify = (event: EventSummary) => {
    if (auth.status !== "signed_in") {
      router.push(routes.login(routes.home));
      return;
    }
    notify.mutate(event.slug, { onSuccess: () => setNotified((ids) => [...ids, event.id]) });
  };

  return (
    <QueryPage query={home} loadingLabel={t("Loading events")}>
      {(data) => (
        <HomePage
          header={<AppHeader />}
          footer={<AppFooter />}
          featured={data.featured.map((event) => ({
            event,
            primaryAction:
              event.queueEnabled && flags.waitingRoom
                ? { label: t("Join the waiting room"), href: routes.queue(event.slug) }
                : { label: t("Get tickets"), href: routes.tickets(event.slug) },
            secondaryAction: { label: event.kind === "match" ? t("Match details") : t("Lineup & info"), href: routes.event(event.slug) },
          }))}
          categories={data.categories}
          category={category}
          onCategoryChange={setCategory}
          onSale={category === "All" ? data.onSale : data.onSale.filter((e) => e.category === category)}
          hrefFor={eventHref}
          comingSoon={{
            events: data.comingSoon,
            notifiedIds: notified,
            pendingId: notify.isPending ? data.comingSoon.find((e) => e.slug === notify.variables)?.id : undefined,
            onNotify: flags.notifyMe ? onNotify : undefined,
          }}
          callout={
            flags.fanId
              ? {
                  eyebrow: t("NEEDED FOR FOOTBALL MATCHES"),
                  title: t("Get your Fan ID in five minutes"),
                  body: t("Scan your national ID or passport and take a selfie. Link family and friends so you can buy for them too."),
                  action: { label: t("Start verification"), href: routes.fanId },
                }
              : undefined
          }
          notice={notify.isError ? t("We couldn't set that reminder. Please try again.") : undefined}
        />
      )}
    </QueryPage>
  );
}
