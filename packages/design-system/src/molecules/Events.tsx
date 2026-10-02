import { eventSummarySchema, fanSchema, formatMoney, ticketTypeSchema } from "@repo/contracts";
import { ChevronRight, X } from "lucide-react";
import { z } from "zod";
import { Badge, saleStatusTone } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/FormControls";
import { DateBadge } from "../atoms/DataDisplay";
import { Avatar } from "../atoms/Identity";
import { Swatch } from "../atoms/Seat";
import { dateTimeLabel, dayLabel, timeLabel } from "../lib/datetime";
import { validateProps, zClassName, zFn, zHref } from "../lib/props";
import { useUI } from "../lib/provider";
import { themeSurface } from "../lib/theme";
import { cn } from "../lib/utils";
import { QuantityStepper } from "./Form";

const kindLabel = (event: z.infer<typeof eventSummarySchema>) => (event.category === "Concerts" ? "Concert" : event.category);

/* ---------- EventCard ---------- */

export const eventCardPropsSchema = z.object({ event: eventSummarySchema, href: zHref, className: zClassName });
export type EventCardProps = z.input<typeof eventCardPropsSchema>;

/** Molecule · EventCard — poster-style card in the "On sale now" grid. */
export function EventCard(props: EventCardProps) {
  validateProps("EventCard", eventCardPropsSchema, props);
  const { event, href, className } = props;
  const { LinkComponent } = useUI();
  return (
    <LinkComponent
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className={cn("flex h-[150px] flex-col justify-between p-[18px]", themeSurface[event.theme])}>
        <span className="self-start rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-ink">{kindLabel(event)}</span>
        <span aria-hidden="true" className="font-display text-[34px] leading-[0.95] font-extrabold uppercase">
          {event.art}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] pt-4 pb-[18px]">
        <span className="text-[13px] text-muted-ink">{dateTimeLabel(event.startsAt)}</span>
        <span className="text-[17px] font-semibold group-hover:underline">{event.title}</span>
        <span className="text-[13px] text-muted-ink">
          {event.venue.name}, {event.venue.area}
        </span>
        <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm">
            From <strong>{formatMoney(event.priceFrom)}</strong>
          </span>
          <Badge tone={saleStatusTone[event.status]}>{event.statusLabel}</Badge>
        </div>
      </div>
    </LinkComponent>
  );
}

/* ---------- EventRow ---------- */

export const eventRowPropsSchema = z.object({ event: eventSummarySchema, href: zHref, className: zClassName });
export type EventRowProps = z.input<typeof eventRowPropsSchema>;

/** Molecule · EventRow — list row in the browse results. */
export function EventRow(props: EventRowProps) {
  validateProps("EventRow", eventRowPropsSchema, props);
  const { event, href, className } = props;
  const { LinkComponent } = useUI();
  return (
    <LinkComponent
      href={href}
      className={cn(
        "flex flex-wrap items-center gap-5 rounded-xl border border-line bg-white px-5 py-4 transition-colors hover:border-ink",
        className,
      )}
    >
      <DateBadge date={event.startsAt} theme={event.theme} />
      <span className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-1">
        <span className="text-[13px] text-muted-ink">{event.tag}</span>
        <span className="text-lg font-semibold">{event.title}</span>
        <span className="text-[13px] text-muted-ink">
          {dayLabel(event.startsAt).split(" ")[0]} {timeLabel(event.startsAt)} · {event.venue.name}, {event.venue.area}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm">
          From <strong>{formatMoney(event.priceFrom)}</strong>
        </span>
        <Badge tone={saleStatusTone[event.status]}>{event.statusLabel}</Badge>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-ink" aria-hidden="true" />
    </LinkComponent>
  );
}

/* ---------- ComingSoonRow ---------- */

export const comingSoonRowPropsSchema = z.object({
  event: eventSummarySchema,
  notified: z.boolean(),
  /** Omit to hide the "Notify me" action (e.g. when notifications are switched off). */
  onNotify: zFn<() => void>().optional(),
  pending: z.boolean().optional(),
  className: zClassName,
});
export type ComingSoonRowProps = z.input<typeof comingSoonRowPropsSchema>;

/** Molecule · ComingSoonRow — upcoming on-sale with a "Notify me" action. */
export function ComingSoonRow(props: ComingSoonRowProps) {
  validateProps("ComingSoonRow", comingSoonRowPropsSchema, props);
  const { event, notified, onNotify, pending, className } = props;
  return (
    <div className={cn("flex items-center gap-4 border-t border-line py-3", className)}>
      <DateBadge date={event.startsAt} variant="plain" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-semibold">{event.title}</span>
        <span className="text-[13px] text-muted-ink">
          {event.tag.split(" · ")[0]} · {event.venue.name}, {event.venue.area}
        </span>
      </div>
      {onNotify ? (
        <Button
          variant={notified ? "ghost" : "outline"}
          onClick={onNotify}
          disabled={notified}
          loading={pending}
          aria-label={notified ? `We'll notify you about ${event.title}` : `Notify me about ${event.title}`}
        >
          {notified ? "Notified ✓" : "Notify me"}
        </Button>
      ) : null}
    </div>
  );
}

/* ---------- FanOption ---------- */

export const fanOptionPropsSchema = z.object({
  fan: fanSchema,
  checked: z.boolean(),
  onCheckedChange: zFn<(checked: boolean) => void>(),
  disabled: z.boolean().optional(),
  /** Why this fan can't be picked right now (e.g. already has a ticket) — shown instead of the Fan ID note. */
  unavailableReason: z.string().optional(),
  className: zClassName,
});
export type FanOptionProps = z.input<typeof fanOptionPropsSchema>;

/** Molecule · FanOption — checkbox row for choosing who's going. Fans under review can't be picked. */
export function FanOption(props: FanOptionProps) {
  validateProps("FanOption", fanOptionPropsSchema, props);
  const { fan, checked, onCheckedChange, disabled, unavailableReason, className } = props;
  const blocked = disabled || !!unavailableReason || fan.status !== "approved";
  const id = `fan-${fan.id}`;
  return (
    <div className={cn("flex min-h-[52px] items-center gap-3 border-t border-line pt-1.5", className)}>
      <Checkbox
        id={id}
        checked={checked && !blocked}
        onCheckedChange={onCheckedChange}
        disabled={blocked}
        aria-describedby={`${id}-note`}
      />
      <Avatar initials={fan.initials} />
      <span className="flex flex-1 flex-col">
        <label htmlFor={id} className={cn("cursor-pointer text-[15px] font-semibold", blocked && "cursor-not-allowed")}>
          {fan.name}
        </label>
        <span id={`${id}-note`} className={cn("text-xs", fan.status === "approved" && !unavailableReason ? "text-pitch" : "text-warn")}>
          {unavailableReason
            ? `${fan.fanIdMasked.split(" ·")[0]} · ${unavailableReason}`
            : fan.status === "approved"
              ? `${fan.fanIdMasked} · approved`
              : fan.fanIdMasked}
        </span>
      </span>
    </div>
  );
}

/* ---------- TicketTypeRow ---------- */

export const ticketTypeRowPropsSchema = z.object({
  ticketType: ticketTypeSchema,
  quantity: z.number().int().min(0),
  onQuantityChange: zFn<(quantity: number) => void>(),
  canIncrease: z.boolean(),
  focused: z.boolean().optional(),
  onFocus: zFn<() => void>().optional(),
  className: zClassName,
});
export type TicketTypeRowProps = z.input<typeof ticketTypeRowPropsSchema>;

/** Molecule · TicketTypeRow — priced ticket type with a quantity stepper. */
export function TicketTypeRow(props: TicketTypeRowProps) {
  validateProps("TicketTypeRow", ticketTypeRowPropsSchema, props);
  const { ticketType, quantity, onQuantityChange, canIncrease, focused, onFocus, className } = props;
  return (
    <div
      onFocusCapture={onFocus}
      className={cn("flex items-center gap-3 rounded-xl px-3.5 py-3", focused ? "border-2 border-plum" : "border border-line", className)}
    >
      <Swatch fill={ticketType.swatch} shape="bar" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{ticketType.name}</span>
        <span className="text-xs text-muted-ink">{ticketType.description}</span>
        <span className="text-sm font-semibold">
          {formatMoney(ticketType.price)} {ticketType.tag ? <span className="text-xs text-warn">{ticketType.tag}</span> : null}
        </span>
      </div>
      <QuantityStepper
        value={quantity}
        onValueChange={onQuantityChange}
        itemLabel={ticketType.name}
        max={canIncrease ? undefined : quantity}
      />
    </div>
  );
}

/* ---------- PickedSeatRow ---------- */

export const pickedSeatRowPropsSchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
  onRemove: zFn<() => void>(),
  showSwatch: z.boolean().optional(),
  className: zClassName,
});
export type PickedSeatRowProps = z.input<typeof pickedSeatRowPropsSchema>;

/** Molecule · PickedSeatRow — a chosen seat with a remove button. */
export function PickedSeatRow(props: PickedSeatRowProps) {
  validateProps("PickedSeatRow", pickedSeatRowPropsSchema, props);
  const { label, detail, onRemove, showSwatch, className } = props;
  return (
    <li className={cn("flex items-center gap-2.5 border-t border-line pt-2.5", className)}>
      {showSwatch ? <Swatch fill="#F2B705" border="solid" borderColor="#121512" shape="seat" className="size-7 border-2" /> : null}
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] text-muted-ink">{detail}</span>
      </span>
      <Button variant="ghost" size="icon" aria-label={`Remove ${label}`} onClick={onRemove} className="text-sub">
        <X className="size-[18px]" aria-hidden="true" />
      </Button>
    </li>
  );
}
