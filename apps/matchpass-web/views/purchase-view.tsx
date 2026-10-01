"use client";

import type { ArenaSeatMap, CinemaSeatMap, EventDetail, HallSeatMap, HoldRequest, StadiumSeatMap, User } from "@repo/contracts";
import {
  ArenaTicketsPage,
  bestTogether,
  CinemaSeatsPage,
  dateTimeLabel,
  EventBanner,
  HallSeatsPage,
  MessagePage,
  StadiumSeatsPage,
  toggleSeat,
  ZoneSelectionPage,
} from "@repo/design-system";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppFooter, AppHeader } from "@/components/app-chrome";
import { errorMessage } from "@/lib/api/client";
import { RequireAuth } from "@/lib/auth/session";
import { useFeatureFlags } from "@/lib/feature-flags/client";
import { useCinemaSeats, useCreateHold, useEvent, useSeatMap } from "@/lib/queries";
import { routes } from "@/lib/routes";
import { turnKey } from "./queue-view";
import { QueryPage } from "./shared";

/** Shared hold → checkout handoff for every ticket picker. */
function useCheckout() {
  const router = useRouter();
  const createHold = useCreateHold();
  return {
    submitting: createHold.isPending,
    error: errorMessage(createHold.error),
    submit: (request: HoldRequest) => createHold.mutate(request, { onSuccess: (hold) => router.push(routes.checkout(hold.id)) }),
  };
}

const eventMeta = (event: EventDetail) =>
  `${dateTimeLabel(event.startsAt)} · ${event.venue.name}${event.kind === "match" ? "" : `, ${event.venue.area}`}`;

export function PurchaseView({ slug }: { slug: string }) {
  const event = useEvent(slug);
  return (
    <RequireAuth>
      {(user) => (
        <QueryPage query={event} loadingLabel="Loading tickets">
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

  if (!onSale) {
    return (
      <MessagePage
        header={<AppHeader active={active} />}
        footer={<AppFooter />}
        title={event.status === "sold_out" ? "Sold out" : "Not on sale yet"}
        body={
          event.status === "sold_out"
            ? "Every ticket for this event has been sold."
            : "Tickets for this event aren't on sale yet. Set a reminder on the event page."
        }
        action={{ label: "Back to the event", href: routes.event(event.slug) }}
      />
    );
  }
  if (event.requiresFanId && user.fanId.status !== "approved") {
    return (
      <MessagePage
        header={<AppHeader active={active} />}
        footer={<AppFooter />}
        title="You need a Fan ID"
        body="Every match ticket is tied to an approved Fan ID. It takes about five minutes."
        action={{ label: "Get your Fan ID", href: routes.fanId }}
      />
    );
  }
  return (
    <QueryPage query={seatMap} active={active} loadingLabel="Loading the venue map">
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
  const self = user.linkedFans.find((f) => f.isSelf && f.status === "approved");
  const [zoneId, setZoneId] = useState("cat1");
  const [fanIds, setFanIds] = useState<string[]>(self ? [self.id] : []);
  const [turnEndsAt] = useState(() =>
    typeof window === "undefined" ? undefined : (sessionStorage.getItem(turnKey(event.id)) ?? undefined),
  );

  return (
    <ZoneSelectionPage
      header={<AppHeader active="matches" />}
      contextBar={{
        title: event.title,
        meta: eventMeta(event),
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
      linkFanHref={flags.fanId ? routes.fanId : undefined}
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
  return (
    <ArenaTicketsPage
      header={<AppHeader active="concerts" />}
      contextBar={{ title: event.title, meta: eventMeta(event) }}
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
  return (
    <HallSeatsPage
      header={<AppHeader active="concerts" />}
      banner={<EventBanner eyebrow={event.tag.toUpperCase()} title={event.title} meta={eventMeta(event)} theme={event.theme} />}
      map={map}
      tierFilter={tierFilter}
      onTierFilterChange={setTierFilter}
      selected={selected}
      onToggleSeat={(id) => {
        const next = toggleSeat(selected, id, event.maxPerOrder, `Up to ${event.maxPerOrder} seats per order.`);
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
  return (
    <CinemaSeatsPage
      header={<AppHeader active="cinema" />}
      banner={
        <EventBanner
          eyebrow={event.tag.toUpperCase()}
          title={event.title}
          meta={`${event.venue.name}, ${event.venue.area} · ${map.screen}`}
          theme="ink"
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
        const next = toggleSeat(selected, id, event.maxPerOrder, `Up to ${event.maxPerOrder} seats per booking.`);
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
  return (
    <RequireAuth>
      {(user) => (
        <QueryPage query={event} loadingLabel="Loading seats">
          {(data) => <StadiumSeatsLoader event={data} user={user} />}
        </QueryPage>
      )}
    </RequireAuth>
  );
}

function StadiumSeatsLoader({ event, user }: { event: EventDetail; user: User }) {
  const seatMap = useSeatMap(event.slug);
  return (
    <QueryPage query={seatMap} active="matches" loadingLabel="Loading the stadium map">
      {(map) =>
        map.layout === "stadium" ? (
          <StadiumSeats event={event} user={user} map={map} />
        ) : (
          <MessagePage
            header={<AppHeader />}
            title="Seat picking isn't available"
            body="This venue sells tickets by type."
            action={{ label: "Choose tickets", href: routes.tickets(event.slug) }}
          />
        )
      }
    </QueryPage>
  );
}

function StadiumSeats({ event, user, map }: { event: EventDetail; user: User; map: StadiumSeatMap }) {
  const checkout = useCheckout();
  const maxSeats = Math.max(1, Math.min(event.maxPerOrder, user.linkedFans.filter((f) => f.status === "approved").length));
  const [blockId, setBlockId] = useState(
    () => map.blocks.find((b) => b.side === "W" && !b.away && b.rows.some((r) => r.seats.includes("a")))?.id ?? map.blocks[0]!.id,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const block = map.blocks.find((b) => b.id === blockId)!;
  const apply = (next: { selected: string[]; message?: string }) => {
    setSelected(next.selected);
    setMessage(next.message);
  };
  return (
    <StadiumSeatsPage
      header={<AppHeader active="matches" />}
      banner={<EventBanner eyebrow={event.tag.toUpperCase()} title={event.title} meta={eventMeta(event)} theme={event.theme} />}
      blocks={map.blocks}
      blockId={blockId}
      onBlockChange={(id) => {
        setBlockId(id);
        setMessage(undefined);
      }}
      selected={selected}
      onToggleSeat={(id) =>
        apply(toggleSeat(selected, id, maxSeats, `You can pick up to ${maxSeats} seats — one for each Fan ID on your order.`))
      }
      onBestTogether={() => apply(bestTogether(block, selected, 2, maxSeats))}
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
