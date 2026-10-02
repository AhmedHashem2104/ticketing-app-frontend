import {
  cinemaSeatsSchema,
  eventSummarySchema,
  fanSchema,
  formatMoney,
  hallSeatMapSchema,
  holdSchema,
  orderSchema,
  queueStatusSchema,
  showtimeSchema,
  stadiumBlockSchema,
  ticketTypeSchema,
  zoneSchema,
} from "@repo/contracts";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Button, LinkButton } from "../atoms/Button";
import { Eyebrow, Heading } from "../atoms/Typography";
import { ErrorState, Legend, LoadingState } from "../molecules/Content";
import { ChipGroup } from "../molecules/Navigation";
import {
  CheckoutForm,
  checkoutFormPropsSchema,
  NextSteps,
  OrderHero,
  OrderPaymentStatus,
  OrderSummaryStrip,
  UpsellBanner,
} from "../organisms/Checkout";
import { EventContextBar, eventContextBarPropsSchema } from "../organisms/EventDetail";
import { MinimalHeader } from "../organisms/Header";
import { WaitingRoomPanel } from "../organisms/Queue";
import {
  ArenaMap,
  FanSelector,
  OrderSummaryCard,
  PickedSeatsPanel,
  SeatMap,
  ShowtimePicker,
  StadiumBlockMap,
  TicketTypePicker,
  TierPriceList,
  ZonePicker,
  ZoneSummaryCard,
} from "../organisms/Seating";
import { dateTimeLabel } from "../lib/datetime";
import { cinemaPicked, cinemaSeatGroups, hallPicked, hallSeatGroups, stadiumPicked, stadiumSeatGroups } from "../lib/seating";
import { validateProps, zFn, zHref, zNode } from "../lib/props";
import { Container, SiteLayout, TwoColumn } from "../templates/Layouts";

const ctaSchema = z.object({ onContinue: zFn<() => void>(), submitting: z.boolean().optional(), error: z.string().optional() });
const contextBarSchema = eventContextBarPropsSchema.omit({ className: true, step: true });

/* ---------- WaitingRoomPage ---------- */

export const waitingRoomPagePropsSchema = z.object({
  event: eventSummarySchema,
  status: queueStatusSchema.optional(),
  error: z.string().optional(),
  onRetry: zFn<() => void>().optional(),
  chooseHref: zHref,
  leaveHref: zHref,
  maskedPhone: z.string().min(1),
  onSmsChange: zFn<(optIn: boolean) => void>(),
  readyNote: z.string().optional(),
});

export type WaitingRoomPageProps = z.input<typeof waitingRoomPagePropsSchema>;

/** Page · Waiting room — focused green layout with the live queue panel. */
export function WaitingRoomPage(props: WaitingRoomPageProps) {
  validateProps("WaitingRoomPage", waitingRoomPagePropsSchema, props);
  const { event, status, error, onRetry, chooseHref, leaveHref, maskedPhone, onSmsChange, readyNote } = props;
  return (
    <SiteLayout
      tone="pitch"
      header={<MinimalHeader tone="dark" trailing={<span className="text-sm text-mint">Official waiting room</span>} />}
    >
      <Container width="focus" className="flex flex-col gap-5 pt-10">
        <div className="flex flex-col gap-1.5 text-center text-white">
          <Eyebrow tone="gold">{event.tag}</Eyebrow>
          <Heading as="h1" size="3xl">
            {event.title}
          </Heading>
          <p className="text-base text-mint">
            {dateTimeLabel(event.startsAt)} · {event.venue.name}
          </p>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : status ? (
          <WaitingRoomPanel
            status={status}
            chooseHref={chooseHref}
            maskedPhone={maskedPhone}
            onSmsChange={onSmsChange}
            readyNote={readyNote}
          />
        ) : (
          <div className="rounded-2xl bg-white">
            <LoadingState label="Joining the waiting room" />
          </div>
        )}
        <AppLink href={leaveHref} tone="inverse" underline className="flex min-h-11 items-center self-center text-[15px]">
          Leave the waiting room
        </AppLink>
      </Container>
    </SiteLayout>
  );
}

/* ---------- ZoneSelectionPage ---------- */

export const zoneSelectionPagePropsSchema = z.object({
  header: zNode,
  contextBar: contextBarSchema,
  zones: z.array(zoneSchema).min(1),
  zoneId: z.string().min(1),
  onZoneChange: zFn<(zoneId: string) => void>(),
  fans: z.array(fanSchema),
  fanIds: z.array(z.string()),
  onFansChange: zFn<(fanIds: string[]) => void>(),
  maxTickets: z.number().int().positive(),
  serviceFee: z.number().nonnegative(),
  exactSeatsHref: zHref.optional(),
  linkFanHref: zHref.optional(),
  /** Fans who can't get a ticket for this match, keyed by fan id, with the reason. */
  unavailableFans: z.record(z.string(), z.string()).optional(),
  cta: ctaSchema,
});

export type ZoneSelectionPageProps = z.input<typeof zoneSelectionPagePropsSchema>;

/** Page · Match zone & Fan IDs. */
export function ZoneSelectionPage(props: ZoneSelectionPageProps) {
  validateProps("ZoneSelectionPage", zoneSelectionPagePropsSchema, props);
  const {
    header,
    contextBar,
    zones,
    zoneId,
    onZoneChange,
    fans,
    fanIds,
    onFansChange,
    maxTickets,
    serviceFee,
    exactSeatsHref,
    linkFanHref,
    unavailableFans,
    cta,
  } = props;
  const zone = zones.find((z) => z.id === zoneId) ?? zones[0]!;
  const count = fanIds.length;
  return (
    <SiteLayout header={header}>
      <EventContextBar {...contextBar} step={1} />
      <Container className="pt-7">
        <TwoColumn
          asideLabel="Your order"
          sticky={false}
          aside={
            <>
              <ZoneSummaryCard zone={zone} />
              <FanSelector
                fans={fans}
                value={fanIds}
                onValueChange={onFansChange}
                max={maxTickets}
                linkFanHref={linkFanHref}
                unavailable={unavailableFans}
              />
              <OrderSummaryCard
                lines={[
                  { label: `${zone.short} × ${count}`, amount: zone.price * count },
                  { label: `Service fee × ${count}`, amount: serviceFee * count },
                ]}
                total={(zone.price + serviceFee) * count}
                error={cta.error}
                cta={{ label: "Continue to payment", onClick: cta.onContinue, loading: cta.submitting, disabled: count === 0 }}
              />
            </>
          }
        >
          <ZonePicker zones={zones} value={zone.id} onValueChange={onZoneChange} exactSeatsHref={exactSeatsHref} />
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- Seat page shared bits ---------- */

const pickedPanelSchema = z.object({ message: z.string().optional(), onRemove: zFn<(seatId: string) => void>() });

/* ---------- StadiumSeatsPage ---------- */

export const stadiumSeatsPagePropsSchema = z.object({
  header: zNode,
  banner: zNode,
  blocks: z.array(stadiumBlockSchema).length(16),
  blockId: z.string().min(1),
  onBlockChange: zFn<(blockId: string) => void>(),
  selected: z.array(z.string()),
  onToggleSeat: zFn<(seatId: string) => void>(),
  onBestTogether: zFn<() => void>(),
  maxSeats: z.number().int().positive(),
  serviceFee: z.number().nonnegative(),
  panel: pickedPanelSchema,
  cta: ctaSchema,
});

export type StadiumSeatsPageProps = z.input<typeof stadiumSeatsPagePropsSchema>;

/** Page · Stadium block & exact seats. */
export function StadiumSeatsPage(props: StadiumSeatsPageProps) {
  validateProps("StadiumSeatsPage", stadiumSeatsPagePropsSchema, props);
  const { header, banner, blocks, blockId, onBlockChange, selected, onToggleSeat, onBestTogether, maxSeats, serviceFee, panel, cta } =
    props;
  const block = blocks.find((b) => b.id === blockId) ?? blocks[0]!;
  const picked = stadiumPicked(blocks, selected);
  const subtotal = picked.reduce((sum, p) => sum + p.price, 0);
  const left = block.rows.reduce((n, r) => n + r.seats.replace(/x/g, "").length, 0);
  const total = block.rows.reduce((n, r) => n + r.seats.length, 0);
  return (
    <SiteLayout header={header}>
      {banner}
      <Container className="pt-7">
        <TwoColumn
          asideLabel="Your seats"
          sticky
          aside={
            <>
              <figure className="relative m-0 flex h-[170px] flex-col justify-end gap-0.5 overflow-hidden rounded-2xl bg-pitch p-4 text-white">
                <svg aria-hidden="true" viewBox="0 0 320 170" preserveAspectRatio="none" className="absolute inset-0 size-full">
                  <polygon points="40,60 280,60 320,170 0,170" fill="#2f7d4a" />
                  <polygon points="40,60 280,60 320,170 0,170" fill="none" stroke="#e8f3ea" strokeWidth="2" opacity="0.7" />
                  <line x1="160" y1="60" x2="160" y2="170" stroke="#e8f3ea" strokeWidth="2" opacity="0.7" />
                  <ellipse cx="160" cy="112" rx="38" ry="16" fill="none" stroke="#e8f3ea" strokeWidth="2" opacity="0.7" />
                  <rect x="0" y="0" width="320" height="60" fill="#121512" opacity="0.35" />
                </svg>
                <figcaption className="relative flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-semibold text-gold">VIEW FROM BLOCK {block.id}</span>
                  <span className="text-sm text-white">
                    {block.sideName} · {left} of {total} seats free
                  </span>
                </figcaption>
              </figure>
              <PickedSeatsPanel
                title="Your seats"
                countLabel={`${picked.length} of ${maxSeats} · one per Fan ID`}
                emptyText="No seats yet. Choose a block on the map, then tap green seats."
                seats={picked}
                onRemove={panel.onRemove}
                message={panel.message ?? cta.error}
                fees={serviceFee * picked.length}
                total={subtotal + serviceFee * picked.length}
                showSwatch
                cta={{ label: "Continue", onClick: cta.onContinue, loading: cta.submitting, disabled: picked.length === 0 }}
              />
            </>
          }
        >
          <StadiumBlockMap blocks={blocks} value={block.id} onValueChange={onBlockChange} />
          <section
            aria-labelledby="block-seats-title"
            className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-4 sm:p-[22px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <Heading id="block-seats-title" size="md">
                  2 · Block {block.id} seats
                </Heading>
                <span className="text-sm text-sub">
                  {block.sideName} · {block.category} · {formatMoney(block.price)} · {left} of {total} seats left
                </span>
              </div>
              <Button variant="outline" onClick={onBestTogether}>
                Best 2 together
              </Button>
            </div>
            <SeatMap
              label={`Block ${block.id} seats`}
              groups={stadiumSeatGroups(block, selected)}
              onToggle={onToggleSeat}
              header={<div className="text-center font-mono text-xs tracking-[0.1em] text-muted-ink">{block.facing}</div>}
            />
            <Legend
              bordered
              items={[
                { label: "Available", swatch: { fill: "#D5E6DA", border: "solid", borderColor: "#0E4D2F", shape: "seat" } },
                { label: "Your pick", swatch: { fill: "#F2B705", border: "solid", borderColor: "#121512", shape: "seat" } },
                { label: "Taken", swatch: { fill: "#E7E4DA", shape: "seat", mark: "×" } },
                { label: "Wheelchair space", swatch: { fill: "#FFFFFF", border: "dashed", borderColor: "#1F4E8C", shape: "seat" } },
              ]}
            />
          </section>
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- ArenaTicketsPage ---------- */

export const arenaTicketsPagePropsSchema = z.object({
  header: zNode,
  contextBar: contextBarSchema,
  ticketTypes: z.array(ticketTypeSchema).min(1),
  note: z.string().optional(),
  quantities: z.record(z.string(), z.number().int().min(0)),
  onQuantitiesChange: zFn<(quantities: Record<string, number>) => void>(),
  focusedId: z.string().optional(),
  onFocusChange: zFn<(id: string) => void>(),
  maxTickets: z.number().int().positive(),
  serviceFee: z.number().nonnegative(),
  cta: ctaSchema,
});

export type ArenaTicketsPageProps = z.input<typeof arenaTicketsPagePropsSchema>;

/** Page · Concert arena ticket types. */
export function ArenaTicketsPage(props: ArenaTicketsPageProps) {
  validateProps("ArenaTicketsPage", arenaTicketsPagePropsSchema, props);
  const { header, contextBar, ticketTypes, note, quantities, onQuantitiesChange, focusedId, onFocusChange, maxTickets, serviceFee, cta } =
    props;
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);
  const subtotal = ticketTypes.reduce((sum, t) => sum + t.price * (quantities[t.id] ?? 0), 0);
  return (
    <SiteLayout header={header}>
      <EventContextBar {...contextBar} step={1} accent="plum" />
      <Container className="pt-7">
        <TwoColumn
          asideLabel="Your tickets"
          asideWidth="lg"
          sticky={false}
          aside={
            <>
              <TicketTypePicker
                ticketTypes={ticketTypes}
                quantities={quantities}
                onQuantitiesChange={onQuantitiesChange}
                max={maxTickets}
                focusedId={focusedId}
                onFocusChange={onFocusChange}
              />
              <OrderSummaryCard
                lines={[
                  { label: `${count} tickets`, amount: subtotal },
                  { label: "Service fee", amount: serviceFee * count },
                ]}
                total={subtotal + serviceFee * count}
                note={`Max ${maxTickets} tickets per order.`}
                error={cta.error}
                cta={{ label: "Continue to payment", onClick: cta.onContinue, loading: cta.submitting, disabled: count === 0 }}
              />
            </>
          }
        >
          <ArenaMap ticketTypes={ticketTypes} focusedId={focusedId} onFocusChange={onFocusChange} note={note} />
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- HallSeatsPage ---------- */

export const hallSeatsPagePropsSchema = z.object({
  header: zNode,
  banner: zNode,
  map: hallSeatMapSchema,
  tierFilter: z.string(),
  onTierFilterChange: zFn<(tier: string) => void>(),
  selected: z.array(z.string()),
  onToggleSeat: zFn<(seatId: string) => void>(),
  maxSeats: z.number().int().positive(),
  serviceFee: z.number().nonnegative(),
  panel: pickedPanelSchema,
  cta: ctaSchema,
});

export type HallSeatsPageProps = z.input<typeof hallSeatsPagePropsSchema>;

/** Page · Concert hall seats with price filters. */
export function HallSeatsPage(props: HallSeatsPageProps) {
  validateProps("HallSeatsPage", hallSeatsPagePropsSchema, props);
  const { header, banner, map, tierFilter, onTierFilterChange, selected, onToggleSeat, maxSeats, serviceFee, panel, cta } = props;
  const picked = hallPicked(map, selected);
  const subtotal = picked.reduce((sum, p) => sum + p.price, 0);
  return (
    <SiteLayout header={header}>
      {banner}
      <Container className="pt-7">
        <TwoColumn
          asideLabel="Prices and your seats"
          aside={
            <>
              <TierPriceList tiers={map.tiers} />
              <PickedSeatsPanel
                title="Your seats"
                countLabel={`${picked.length} of ${maxSeats}`}
                emptyText="Tap any coloured seat to add it. Tap again to remove."
                seats={picked}
                onRemove={panel.onRemove}
                message={panel.message ?? cta.error}
                fees={serviceFee * picked.length}
                total={subtotal + serviceFee * picked.length}
                cta={{ label: "Continue", onClick: cta.onContinue, loading: cta.submitting, disabled: picked.length === 0 }}
              />
            </>
          }
        >
          <section
            aria-labelledby="hall-title"
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-[22px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Heading id="hall-title" size="md">
                Choose your seats
              </Heading>
              <ChipGroup
                label="Show prices"
                size="sm"
                tone="plum"
                value={tierFilter}
                onValueChange={onTierFilterChange}
                options={[{ value: "all", label: "All prices" }, ...map.tiers.map((t) => ({ value: t.id, label: formatMoney(t.price) }))]}
              />
            </div>
            <SeatMap
              label="Concert hall seats"
              size="sm"
              groups={hallSeatGroups(map, selected, tierFilter)}
              onToggle={onToggleSeat}
              header={
                <div className="flex justify-center" aria-hidden="true">
                  <div className="flex h-11 w-3/5 items-center justify-center rounded-b-[120px] bg-ink font-display text-lg font-extrabold tracking-[0.25em] text-white">
                    STAGE
                  </div>
                </div>
              }
            />
            <Legend
              bordered
              items={[
                { label: "Your pick", swatch: { fill: "#F2B705", border: "solid", borderColor: "#121512", shape: "seat" } },
                { label: "Taken", swatch: { fill: "#D6D2C6", shape: "seat", mark: "×" } },
                { label: "Wheelchair space", swatch: { fill: "#FFFFFF", border: "dashed", borderColor: "#1F4E8C", shape: "seat" } },
              ]}
            />
          </section>
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- CinemaSeatsPage ---------- */

export const cinemaSeatsPagePropsSchema = z.object({
  header: zNode,
  banner: zNode,
  showtimes: z.array(showtimeSchema).min(1),
  showtimeId: z.string().min(1),
  onShowtimeChange: zFn<(id: string) => void>(),
  seats: cinemaSeatsSchema.optional(),
  seatsError: z.string().optional(),
  selected: z.array(z.string()),
  onToggleSeat: zFn<(seatId: string) => void>(),
  maxSeats: z.number().int().positive(),
  bookingFee: z.number().nonnegative(),
  screenLabel: z.string().min(1),
  panel: pickedPanelSchema,
  cta: ctaSchema,
});

export type CinemaSeatsPageProps = z.input<typeof cinemaSeatsPagePropsSchema>;

/** Page · Cinema showtime & seats. */
export function CinemaSeatsPage(props: CinemaSeatsPageProps) {
  validateProps("CinemaSeatsPage", cinemaSeatsPagePropsSchema, props);
  const {
    header,
    banner,
    showtimes,
    showtimeId,
    onShowtimeChange,
    seats,
    seatsError,
    selected,
    onToggleSeat,
    maxSeats,
    bookingFee,
    screenLabel,
    panel,
    cta,
  } = props;
  const showtime = showtimes.find((s) => s.id === showtimeId) ?? showtimes[0]!;
  const picked = seats ? cinemaPicked(seats, showtime, selected) : [];
  const subtotal = picked.reduce((sum, p) => sum + p.price, 0);
  return (
    <SiteLayout header={header}>
      {banner}
      <Container className="pt-7">
        <TwoColumn
          asideLabel="Your showing"
          aside={
            <PickedSeatsPanel
              prefix={
                <div className="flex flex-col gap-0.5 border-b border-line pb-2.5">
                  <Eyebrow size="sm">Your showing</Eyebrow>
                  <span className="text-[17px] font-semibold">
                    {showtime.dayLabel === "Today" ? "Today" : showtime.dayLabel} {showtime.dayNumber} · {showtime.time}
                  </span>
                  <span className="text-[13px] text-muted-ink">
                    {screenLabel} · {showtime.format} · Standard {formatMoney(showtime.prices.standard)} · Recliner{" "}
                    {formatMoney(showtime.prices.vip)}
                  </span>
                </div>
              }
              title="Seats"
              countLabel={`${picked.length} of ${maxSeats}`}
              emptyText="Tap green seats to choose. Row J is VIP recliners."
              seats={picked}
              onRemove={panel.onRemove}
              message={panel.message ?? cta.error}
              feeLabel="Booking fee"
              fees={bookingFee * picked.length}
              total={subtotal + bookingFee * picked.length}
              cta={{ label: "Continue to payment", onClick: cta.onContinue, loading: cta.submitting, disabled: picked.length === 0 }}
            />
          }
        >
          <ShowtimePicker showtimes={showtimes} value={showtime.id} onValueChange={onShowtimeChange} />
          <section
            aria-labelledby="cinema-seats-title"
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-[22px]"
          >
            <Heading id="cinema-seats-title" size="md">
              2 · Pick your seats
            </Heading>
            {seatsError ? (
              <ErrorState message={seatsError} />
            ) : seats ? (
              <SeatMap
                label="Cinema seats"
                size="lg"
                groups={cinemaSeatGroups(seats, showtime, selected)}
                onToggle={onToggleSeat}
                header={
                  <div className="flex flex-col items-center gap-1.5 pb-2.5" aria-hidden="true">
                    <div className="h-[26px] w-[78%] rounded-[50%_50%_0_0/100%_100%_0_0] border-t-[6px] border-ink" />
                    <span className="font-mono text-xs tracking-[0.3em] text-muted-ink">SCREEN</span>
                  </div>
                }
              />
            ) : (
              <LoadingState label="Loading seats" />
            )}
            <Legend
              bordered
              items={[
                { label: "Standard", swatch: { fill: "#D5E6DA", border: "solid", borderColor: "#0E4D2F", shape: "seat" } },
                { label: "VIP recliner", swatch: { fill: "#0E4D2F", shape: "seat", wide: true } },
                { label: "Your pick", swatch: { fill: "#F2B705", border: "solid", borderColor: "#121512", shape: "seat" } },
                { label: "Taken", swatch: { fill: "#D6D2C6", shape: "seat", mark: "×" } },
                { label: "Wheelchair space", swatch: { fill: "#FFFFFF", border: "dashed", borderColor: "#1F4E8C", shape: "seat" } },
              ]}
            />
          </section>
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- CheckoutPage ---------- */

export const checkoutPagePropsSchema = z.object({
  header: zNode,
  hold: holdSchema,
  backHref: zHref,
  onExpire: zFn<() => void>().optional(),
  form: checkoutFormPropsSchema.omit({ hold: true, className: true }),
});

export type CheckoutPageProps = z.input<typeof checkoutPagePropsSchema>;

/** Page · Checkout & payment. */
export function CheckoutPage(props: CheckoutPageProps) {
  validateProps("CheckoutPage", checkoutPagePropsSchema, props);
  const { header, hold, backHref, onExpire, form } = props;
  const plum = hold.theme === "plum" || hold.theme === "violet";
  return (
    <SiteLayout header={header}>
      <EventContextBar
        back={{ label: "Back to tickets", href: backHref }}
        step={2}
        accent={plum ? "plum" : "pitch"}
        expiresAt={hold.expiresAt}
        onExpire={onExpire}
      />
      <Container className="pt-7">
        <CheckoutForm hold={hold} {...form} />
      </Container>
    </SiteLayout>
  );
}

/* ---------- OrderConfirmationPage ---------- */

export const orderConfirmationPagePropsSchema = z.object({
  header: zNode,
  order: orderSchema,
  ticketsHref: zHref,
  /** Where to retry a failed payment (the checkout for the same hold). */
  retryHref: zHref.optional(),
  /** Where to start again once the order expired. */
  eventHref: zHref.optional(),
  onAddToCalendar: zFn<() => void>().optional(),
  onDownloadReceipt: zFn<() => void>().optional(),
  parking: z.object({ onAdd: zFn<() => void>(), added: z.boolean() }).optional(),
});

export type OrderConfirmationPageProps = z.input<typeof orderConfirmationPagePropsSchema>;

/** Page · Order confirmation, including payments still in progress, failed or expired. */
export function OrderConfirmationPage(props: OrderConfirmationPageProps) {
  validateProps("OrderConfirmationPage", orderConfirmationPagePropsSchema, props);
  const { header, order, ticketsHref, retryHref, eventHref, onAddToCalendar, onDownloadReceipt, parking } = props;
  if (order.status !== "paid") {
    return (
      <SiteLayout header={header}>
        <Container width="narrow" className="flex flex-col gap-7 pt-12">
          <OrderPaymentStatus order={order} retryHref={retryHref} eventHref={eventHref} />
        </Container>
      </SiteLayout>
    );
  }
  return (
    <SiteLayout header={header}>
      <Container width="narrow" className="flex flex-col gap-7 pt-12">
        <OrderHero title="You're going" reference={order.reference} note="Confirmation sent by SMS and email" />
        <OrderSummaryStrip order={order} />
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href={ticketsHref} variant="primary" size="xl">
            View my tickets
          </LinkButton>
          {onAddToCalendar ? (
            <Button variant="outline" size="xl" className="font-normal" onClick={onAddToCalendar}>
              Add to calendar
            </Button>
          ) : null}
          {onDownloadReceipt ? (
            <Button variant="outline" size="xl" className="font-normal" onClick={onDownloadReceipt}>
              Download receipt
            </Button>
          ) : null}
        </div>
        {order.nextSteps.length ? <NextSteps steps={order.nextSteps} /> : null}
        {parking && order.parkingOffer ? (
          <UpsellBanner
            title={order.parkingOffer.title}
            detail={order.parkingOffer.detail}
            actionLabel="Add parking"
            onAction={parking.onAdd}
            done={parking.added}
            doneLabel="Parking added"
          />
        ) : null}
      </Container>
    </SiteLayout>
  );
}
