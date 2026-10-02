"use client";

import type { ArenaSeatMap, CinemaSeatMap, EventDetail, HallSeatMap, HoldRequest, StadiumSeatMap, User } from "@repo/contracts";
import {
  ArenaTicketsPage,
  bestTogether,
  CinemaSeatsPage,
  EventBanner,
  HallSeatsPage,
  MessagePage,
  StadiumSeatsPage,
  toggleSeat,
  useI18n,
  ZoneSelectionPage,
} from "@repo/design-system";
import type { Formatters } from "@repo/i18n";
import { useMemo, useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage } from "@/lib/api/client";
import { RequireAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useCinemaSeats, useCreateHold, useEvent, useSeatMap, useUnavailableFans } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { turnKey } from "./queue-view";
import { QueryPage } from "./shared";
import { useLocalizedRouter } from "@/lib/i18n/navigation";

/** Shared hold → checkout handoff for every ticket picker. */
function useCheckout() {
  const router = useLocalizedRouter();
  const createHold = useCreateHold();
  return {
    submitting: createHold.isPending,
    error: errorMessage(createHold.error),
    submit: (request: HoldRequest) => createHold.mutate(request, { onSuccess: (hold) => router.push(routes.checkout(hold.id)) }),
  };
}

const eventMeta = (event: EventDetail, f: Formatters) =>
  `${f.dateTimeLabel(event.startsAt)} · ${event.venue.name}${event.kind === "match" ? "" : `, ${event.venue.area}`}`;

export function PurchaseView({ slug }: { slug: string }) {
  const event = useEvent(slug);
  const { t } = useI18n();
  return (
    <RequireAuth>
      {(user) => (
        <QueryPage query={event} loadingLabel={t("Loading tickets")}>
          {(data) => <Picker event={data} user={user} />}
        </QueryPage>
      )}
    </RequireAuth>
  );
}

function Picker({ event, user }: { event: EventDetail; user: User }) {
  const onSale = event.status !== "coming_soon" && event.status !== "sold_out";
  const seatMap = useSeatMap(event.slug, onSale);
  const active = event.kind === "match" ? "matches" : event.kind === "cinema" ? "cinema" : "concerts";
  const { t } = useI18n();

  if (!onSale) {
    return (
      <MessagePage
        header={<AppHeader active={active} />}
        footer={<AppFooter />}
        title={event.status === "sold_out" ? t("Sold out") : t("Not on sale yet")}
        body={
          event.status === "sold_out"
            ? t("Every ticket for this event has been sold.")
            : t("Tickets for this event aren't on sale yet. Set a reminder on the event page.")
        }
        action={{ label: t("Back to the event"), href: routes.event(event.slug) }}
      />
    );
  }
  if (event.requiresFanId && user.fanId.status !== "approved") {
    return (
      <MessagePage
        header={<AppHeader active={active} />}
        footer={<AppFooter />}
        title={t("You need a Fan ID")}
        body={t("Every match ticket is tied to an approved Fan ID. It takes about five minutes.")}
        action={{ label: t("Get your Fan ID"), href: routes.fanId }}
      />
    );
  }
  return (
    <QueryPage query={seatMap} active={active} loadingLabel={t("Loading the venue map")}>
      {(map) =>
        map.layout === "stadium" ? (
          <ZonePickerView event={event} user={user} map={map} />
        ) : map.layout === "arena" ? (
          <ArenaView event={event} map={map} />
        ) : map.layout === "hall" ? (
          <HallView event={event} map={map} />
        ) : (
          <CinemaView event={event} map={map} />
        )
      }
    </QueryPage>
  );
}

function ZonePickerView({ event, user, map }: { event: EventDetail; user: User; map: StadiumSeatMap }) {
  const flags = useFeatureFlags();
  const checkout = useCheckout();
  const { f } = useI18n();
  const self = user.linkedFans.find((f) => f.isSelf && f.status === "approved");
  const eligibility = useUnavailableFans(event.slug, true);
  const [zoneId, setZoneId] = useState("cat1");
  const [picked, setFanIds] = useState<string[] | undefined>();
  // Pre-select the fan themselves — unless they already have a ticket for this match.
  const fanIds = picked ?? (self && eligibility.ready && !eligibility.unavailable[self.id] ? [self.id] : []);
  const [turnEndsAt] = useState(() =>
    typeof window === "undefined" ? undefined : (sessionStorage.getItem(turnKey(event.id)) ?? undefined),
  );

  return (
    <ZoneSelectionPage
      header={<AppHeader active="matches" />}
      contextBar={{
        title: event.title,
        meta: eventMeta(event, f),
        imageUrl: event.imageUrl,
        expiresAt: turnEndsAt && new Date(turnEndsAt) > new Date() ? turnEndsAt : undefined,
      }}
      zones={map.zones}
      zoneId={zoneId}
      onZoneChange={setZoneId}
      fans={user.linkedFans}
      fanIds={fanIds}
      onFansChange={setFanIds}
      maxTickets={event.maxPerOrder}
      serviceFee={event.serviceFee}
      exactSeatsHref={flags.exactSeatSelection ? routes.seats(event.slug) : undefined}
      linkFanHref={flags.fanId ? routes.account : undefined}
      unavailableFans={eligibility.unavailable}
      cta={{
        onContinue: () => checkout.submit({ type: "zone", eventId: event.id, zoneId, fanIds }),
        submitting: checkout.submitting,
        error: checkout.error,
      }}
    />
  );
}

function ArenaView({ event, map }: { event: EventDetail; map: ArenaSeatMap }) {
  const checkout = useCheckout();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [focusedId, setFocusedId] = useState(map.ticketTypes[0]?.id);
  const { f } = useI18n();
  return (
    <ArenaTicketsPage
      header={<AppHeader active="concerts" />}
      contextBar={{ title: event.title, meta: eventMeta(event, f), imageUrl: event.imageUrl }}
      ticketTypes={map.ticketTypes}
      note={map.note}
      quantities={quantities}
      onQuantitiesChange={setQuantities}
      focusedId={focusedId}
      onFocusChange={setFocusedId}
      maxTickets={event.maxPerOrder}
      serviceFee={event.serviceFee}
      cta={{
        onContinue: () =>
          checkout.submit({
            type: "ticket_types",
            eventId: event.id,
            items: Object.entries(quantities)
              .filter(([, quantity]) => quantity > 0)
              .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
          }),
        submitting: checkout.submitting,
        error: checkout.error,
      }}
    />
  );
}

function HallView({ event, map }: { event: EventDetail; map: HallSeatMap }) {
  const checkout = useCheckout();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const [tierFilter, setTierFilter] = useState("all");
  const { t, f } = useI18n();
  return (
    <HallSeatsPage
      header={<AppHeader active="concerts" />}
      banner={
        <EventBanner
          eyebrow={event.tag.toUpperCase()}
          title={event.title}
          meta={eventMeta(event, f)}
          theme={event.theme}
          imageUrl={event.imageUrl}
        />
      }
      map={map}
      tierFilter={tierFilter}
      onTierFilterChange={setTierFilter}
      selected={selected}
      onToggleSeat={(id) => {
        const next = toggleSeat(selected, id, event.maxPerOrder, t("Up to {max} seats per order.", { max: event.maxPerOrder }));
        setSelected(next.selected);
        setMessage(next.message);
      }}
      maxSeats={event.maxPerOrder}
      serviceFee={event.serviceFee}
      panel={{ message, onRemove: (id) => setSelected((s) => s.filter((x) => x !== id)) }}
      cta={{
        onContinue: () => checkout.submit({ type: "seats", eventId: event.id, seatIds: selected }),
        submitting: checkout.submitting,
        error: checkout.error,
      }}
    />
  );
}

function CinemaView({ event, map }: { event: EventDetail; map: CinemaSeatMap }) {
  const checkout = useCheckout();
  const [showtimeId, setShowtimeId] = useState(map.showtimes[0]!.id);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const seats = useCinemaSeats(event.slug, showtimeId);
  const showtime = useMemo(() => map.showtimes.find((s) => s.id === showtimeId)!, [map, showtimeId]);
  const { t } = useI18n();
  return (
    <CinemaSeatsPage
      header={<AppHeader active="cinema" />}
      banner={
        <EventBanner
          eyebrow={event.tag.toUpperCase()}
          title={event.title}
          meta={`${event.venue.name}, ${event.venue.area} · ${map.screen}`}
          theme="ink"
          imageUrl={event.imageUrl}
          poster
        />
      }
      showtimes={map.showtimes}
      showtimeId={showtime.id}
      onShowtimeChange={(id) => {
        setShowtimeId(id);
        setSelected([]);
        setMessage(undefined);
      }}
      seats={seats.data?.showtimeId === showtimeId ? seats.data : undefined}
      seatsError={errorMessage(seats.error)}
      selected={selected}
      onToggleSeat={(id) => {
        const next = toggleSeat(selected, id, event.maxPerOrder, t("Up to {max} seats per booking.", { max: event.maxPerOrder }));
        setSelected(next.selected);
        setMessage(next.message);
      }}
      maxSeats={event.maxPerOrder}
      bookingFee={event.serviceFee}
      screenLabel={map.screen}
      panel={{ message, onRemove: (id) => setSelected((s) => s.filter((x) => x !== id)) }}
      cta={{
        onContinue: () => checkout.submit({ type: "seats", eventId: event.id, showtimeId, seatIds: selected }),
        submitting: checkout.submitting,
        error: checkout.error,
      }}
    />
  );
}

/* ---------- Exact stadium seats ---------- */

export function StadiumSeatsView({ slug }: { slug: string }) {
  const event = useEvent(slug);
  const { t } = useI18n();
  return (
    <RequireAuth>
      {(user) => (
        <QueryPage query={event} loadingLabel={t("Loading seats")}>
          {(data) => <StadiumSeatsLoader event={data} user={user} />}
        </QueryPage>
      )}
    </RequireAuth>
  );
}

function StadiumSeatsLoader({ event, user }: { event: EventDetail; user: User }) {
  const seatMap = useSeatMap(event.slug);
  const { t } = useI18n();
  return (
    <QueryPage query={seatMap} active="matches" loadingLabel={t("Loading the stadium map")}>
      {(map) =>
        map.layout === "stadium" ? (
          <StadiumSeats event={event} user={user} map={map} />
        ) : (
          <MessagePage
            header={<AppHeader />}
            title={t("Seat picking isn't available")}
            body={t("This venue sells tickets by type.")}
            action={{ label: t("Choose tickets"), href: routes.tickets(event.slug) }}
          />
        )
      }
    </QueryPage>
  );
}

function StadiumSeats({ event, user, map }: { event: EventDetail; user: User; map: StadiumSeatMap }) {
  const checkout = useCheckout();
  const eligibility = useUnavailableFans(event.slug, true);
  const eligibleFans = user.linkedFans.filter((f) => f.status === "approved" && !eligibility.unavailable[f.id]).length;
  const maxSeats = Math.max(1, Math.min(event.maxPerOrder, eligibleFans));
  const [blockId, setBlockId] = useState(
    () => map.blocks.find((b) => b.side === "W" && !b.away && b.rows.some((r) => r.seats.includes("a")))?.id ?? map.blocks[0]!.id,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const block = map.blocks.find((b) => b.id === blockId)!;
  const { t, f } = useI18n();
  const apply = (next: { selected: string[]; message?: string }) => {
    setSelected(next.selected);
    setMessage(next.message);
  };
  return (
    <StadiumSeatsPage
      header={<AppHeader active="matches" />}
      banner={
        <EventBanner
          eyebrow={event.tag.toUpperCase()}
          title={event.title}
          meta={eventMeta(event, f)}
          theme={event.theme}
          imageUrl={event.imageUrl}
        />
      }
      blocks={map.blocks}
      blockId={blockId}
      onBlockChange={(id) => {
        setBlockId(id);
        setMessage(undefined);
      }}
      selected={selected}
      onToggleSeat={(id) =>
        apply(
          toggleSeat(selected, id, maxSeats, t("You can pick up to {max} seats — one for each Fan ID on your order.", { max: maxSeats })),
        )
      }
      onBestTogether={() => apply(bestTogether(block, selected, 2, maxSeats, { t }))}
      maxSeats={maxSeats}
      serviceFee={event.serviceFee}
      panel={{ message, onRemove: (id) => setSelected((s) => s.filter((x) => x !== id)) }}
      cta={{
        onContinue: () => checkout.submit({ type: "seats", eventId: event.id, seatIds: selected }),
        submitting: checkout.submitting,
        error: checkout.error,
      }}
    />
  );
}
