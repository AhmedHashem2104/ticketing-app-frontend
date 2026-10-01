"use client";

import type { EventDetail } from "@repo/contracts";
import { ConcertDetailPage, LinkButton, MatchDetailPage } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { useAuth } from "@/lib/auth/session";
import { buildIcs, downloadFile } from "@/lib/downloads";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { errorMessage } from "@/lib/api/client";
import { useEvent, useNotify, usePresale } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { PageLoading, QueryPage } from "./shared";

function buyAction(event: EventDetail, waitingRoom: boolean) {
  if (event.status === "coming_soon")
    return { label: "Not on sale yet — browse others", href: routes.events(event.kind === "match" ? "matches" : "concerts") };
  if (event.status === "sold_out")
    return { label: "Sold out — browse others", href: routes.events(event.kind === "match" ? "matches" : "concerts") };
  if (event.queueEnabled && waitingRoom) return { label: "Join the waiting room", href: routes.queue(event.slug) };
  return { label: "Get tickets", href: routes.tickets(event.slug) };
}

export function EventView({ slug }: { slug: string }) {
  const query = useEvent(slug);
  const router = useRouter();
  const isCinema = query.data?.kind === "cinema";

  useEffect(() => {
    if (isCinema) router.replace(routes.tickets(slug));
  }, [isCinema, router, slug]);

  if (isCinema) return <PageLoading />;
  return (
    <QueryPage query={query} loadingLabel="Loading event">
      {(event) => (event.kind === "match" ? <MatchView event={event} /> : <ShowView event={event} />)}
    </QueryPage>
  );
}

function useReminder(event: EventDetail) {
  const auth = useAuth();
  const router = useRouter();
  const notify = useNotify();
  const [active, setActive] = useState(false);
  return {
    active,
    pending: notify.isPending,
    onSet: () => {
      if (auth.status !== "signed_in") return router.push(routes.login(routes.event(event.slug)));
      notify.mutate(event.slug, { onSuccess: () => setActive(true) });
    },
  };
}

const addToCalendar = (event: EventDetail) =>
  downloadFile(
    `${event.slug}.ics`,
    buildIcs({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      location: `${event.venue.name}, ${event.venue.area}`,
      description: event.headline,
    }),
    "text/calendar",
  );

function MatchView({ event }: { event: EventDetail }) {
  const flags = useFeatureFlags();
  const auth = useAuth();
  const reminder = useReminder(event);
  const approvedFans = auth.status === "signed_in" ? auth.user.linkedFans.filter((f) => f.status === "approved" && !f.isSelf) : [];

  const fanIdNotice =
    auth.status === "signed_in"
      ? auth.user.fanId.status === "approved"
        ? {
            tone: "success" as const,
            title: "Your Fan ID is approved",
            body: approvedFans.length
              ? `${approvedFans.length} linked fan${approvedFans.length === 1 ? "" : "s"} ready: ${approvedFans.map((f) => f.name).join(", ")}`
              : "Link family and friends to buy for them too.",
          }
        : {
            tone: "warning" as const,
            title: "You need an approved Fan ID for this match",
            action: flags.fanId ? (
              <LinkButton href={routes.fanId} variant="outline-warning" size="md">
                Get your Fan ID
              </LinkButton>
            ) : undefined,
          }
      : auth.status === "signed_out"
        ? {
            tone: "warning" as const,
            title: "Sign in with an approved Fan ID to buy",
            action: (
              <LinkButton href={routes.login(routes.event(event.slug))} variant="outline-warning" size="md">
                Sign in
              </LinkButton>
            ),
          }
        : undefined;

  return (
    <MatchDetailPage
      header={<AppHeader active="matches" />}
      footer={<AppFooter />}
      event={event}
      breadcrumbs={[
        { label: "Matches", href: routes.events("matches") },
        { label: event.category },
        { label: event.tag.split(" · ")[1] ?? event.tag },
      ]}
      buyBox={{
        saleOpensAt: event.queueEnabled && flags.waitingRoom ? event.saleOpensAt : undefined,
        priceFrom: event.priceFrom,
        action: buyAction(event, flags.waitingRoom),
        reminder: flags.notifyMe ? reminder : undefined,
        onAddToCalendar: () => addToCalendar(event),
      }}
      fanIdNotice={fanIdNotice}
    />
  );
}

function ShowView({ event }: { event: EventDetail }) {
  const flags = useFeatureFlags();
  const presale = usePresale(event.slug);
  return (
    <ConcertDetailPage
      header={<AppHeader active="concerts" />}
      footer={<AppFooter />}
      event={event}
      breadcrumbs={[
        { label: "Concerts & events", href: routes.events("concerts") },
        { label: event.tag.split(" · ")[1] ?? event.category },
      ]}
      buyBox={{
        priceFrom: event.priceFrom,
        scarcityNote: event.scarcityNote,
        action: buyAction(event, flags.waitingRoom),
        footnote: event.priceNote,
        presale:
          flags.promoCodes && event.presaleCodeEnabled
            ? {
                onApply: async (code) => {
                  await presale.mutateAsync(code).catch(() => undefined);
                },
                pending: presale.isPending,
                appliedCode: presale.data?.code,
                error: errorMessage(presale.error),
              }
            : undefined,
      }}
    />
  );
}
