import {
  countAvailable,
  fanSchema,
  formatMoney,
  hallTierSchema,
  showtimeSchema,
  stadiumBlockSchema,
  ticketTypeSchema,
  zoneSchema,
  type StadiumBlock,
} from "@repo/contracts";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Button, LinkButton } from "../atoms/Button";
import { Seat, seatStateValues } from "../atoms/Seat";
import { Eyebrow, Heading } from "../atoms/Typography";
import { Legend, SummaryRow } from "../molecules/Content";
import { FanOption, PickedSeatRow, TicketTypeRow } from "../molecules/Events";
import { validateProps, zClassName, zColor, zFn, zHref, zNode } from "../lib/props";
import { cn } from "../lib/utils";

/* ---------- ZonePicker ---------- */

export const zonePickerPropsSchema = z
  .object({
    zones: z.array(zoneSchema).min(1),
    value: z.string().min(1),
    onValueChange: zFn<(zoneId: string) => void>(),
    exactSeatsHref: zHref.optional(),
    className: zClassName,
  })
  .refine((p) => p.zones.some((z) => z.id === p.value && !z.restricted), { error: "value must be a selectable zone", path: ["value"] });

export type ZonePickerProps = z.input<typeof zonePickerPropsSchema>;

/** Organism · ZonePicker — stadium-shaped zone selector. */
export function ZonePicker(props: ZonePickerProps) {
  validateProps("ZonePicker", zonePickerPropsSchema, props);
  const { zones, value, onValueChange, exactSeatsHref, className } = props;
  const zone = (id: string) => zones.find((z) => z.id === id);
  const zoneButton = (id: string, area: string, vertical?: "up" | "down") => {
    const z = zone(id);
    if (!z) return null;
    const selected = z.id === value;
    const few = z.availability === "few_left" || z.availability === "high_demand";
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={z.restricted}
        onClick={() => onValueChange(z.id)}
        aria-label={`${z.name}, ${z.where}, ${formatMoney(z.price)}${z.restricted ? `, ${z.restrictedLabel ?? "not for sale to you"}` : `, ${z.availabilityLabel}`}`}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-sm font-semibold transition-colors sm:text-[15px]",
          area,
          vertical === "up" && "rotate-180 [writing-mode:vertical-rl]",
          vertical === "down" && "[writing-mode:vertical-rl]",
          z.restricted
            ? "border-2 border-dashed border-stone bg-sand font-normal text-sub"
            : selected
              ? "border-[3px] border-ink bg-pitch text-white"
              : few
                ? "border border-transparent bg-amber-soft text-amber-ink hover:border-ink"
                : "border border-transparent bg-mint text-pitch hover:border-ink",
        )}
      >
        {id === "cat3" ? (
          <>
            {z.where} · {z.short.replace("Category ", "Cat ")}
            <span className="text-[13px] font-normal">
              {formatMoney(z.price)} · {z.availabilityLabel.toLowerCase()}
            </span>
          </>
        ) : id === "away" ? (
          <>
            {z.where} · {z.name}
            <span className="text-[13px]">{z.restrictedLabel}</span>
          </>
        ) : id === "vip" ? (
          `${z.short} · ${formatMoney(z.price)}`
        ) : (
          `${z.where} · ${z.short.replace("Category ", "Cat ")} · ${formatMoney(z.price)}`
        )}
      </button>
    );
  };
  return (
    <section
      aria-labelledby="zone-title"
      className={cn("flex flex-col gap-[18px] rounded-2xl border border-line bg-white p-4 sm:p-6", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading as="h1" id="zone-title" size="xl">
          Choose your zone
        </Heading>
        {exactSeatsHref ? (
          <AppLink href={exactSeatsHref} tone="pitch" underline className="flex min-h-11 items-center text-sm">
            Pick exact seats by block →
          </AppLink>
        ) : null}
      </div>
      <div
        role="group"
        aria-label="Stadium zones"
        className="grid grid-cols-[56px_80px_minmax(0,1fr)_80px] grid-rows-[100px_260px_100px] gap-2 sm:grid-cols-[84px_120px_minmax(0,1fr)_120px] sm:grid-rows-[100px_320px_100px]"
      >
        {zoneButton("cat3", "col-[2/5] row-[1/2]")}
        {zoneButton("vip", "col-[1/2] row-[2/3]", "up")}
        {zoneButton("cat1", "col-[2/3] row-[2/3]", "up")}
        <div
          aria-hidden="true"
          className="relative col-[3/4] row-[2/3] flex items-center justify-center rounded-lg border-[3px] border-white bg-forest"
        >
          <div className="size-[70px] rounded-full border-[3px] border-white sm:size-[90px]" />
          <div className="absolute inset-y-0 left-1/2 border-l-[3px] border-white" />
        </div>
        {zoneButton("cat2", "col-[4/5] row-[2/3]", "down")}
        {zoneButton("away", "col-[2/5] row-[3/4]")}
      </div>
      <Legend
        items={[
          { label: "Selected", swatch: { fill: "#0E4D2F" } },
          { label: "Available", swatch: { fill: "#D5E6DA" } },
          { label: "Few left", swatch: { fill: "#FCE8A6" } },
          { label: "Not for sale to you", swatch: { fill: "#E7E4DA", border: "dashed", borderColor: "#8C8F88" } },
        ]}
      />
    </section>
  );
}

/* ---------- ZoneSummaryCard ---------- */

export const zoneSummaryCardPropsSchema = z.object({ zone: zoneSchema, className: zClassName });
export type ZoneSummaryCardProps = z.input<typeof zoneSummaryCardPropsSchema>;

/** Organism · ZoneSummaryCard — details of the chosen zone. */
export function ZoneSummaryCard(props: ZoneSummaryCardProps) {
  validateProps("ZoneSummaryCard", zoneSummaryCardPropsSchema, props);
  const { zone, className } = props;
  return (
    <section
      aria-label="Selected zone"
      aria-live="polite"
      className={cn("flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-[22px]", className)}
    >
      <Eyebrow size="sm">Selected zone</Eyebrow>
      <Heading as="h2" size="lg">
        {zone.name}
      </Heading>
      <span className="text-sm text-sub">
        {zone.where} · Gates {zone.gates}
      </span>
      <span className="text-sm text-sub">{zone.note}</span>
      <span className="pt-1.5 text-xl font-semibold">
        {formatMoney(zone.price)} <span className="text-sm font-normal text-muted-ink">per ticket</span>
      </span>
    </section>
  );
}

/* ---------- FanSelector ---------- */

export const fanSelectorPropsSchema = z
  .object({
    fans: z.array(fanSchema),
    value: z.array(z.string()),
    onValueChange: zFn<(fanIds: string[]) => void>(),
    max: z.number().int().positive(),
    linkFanHref: zHref.optional(),
    error: z.string().optional(),
    className: zClassName,
  })
  .refine((p) => p.value.length <= p.max, { error: "More fans selected than allowed", path: ["value"] });

export type FanSelectorProps = z.input<typeof fanSelectorPropsSchema>;

/** Organism · FanSelector — "Who's going?" with one ticket per approved Fan ID. */
export function FanSelector(props: FanSelectorProps) {
  validateProps("FanSelector", fanSelectorPropsSchema, props);
  const { fans, value, onValueChange, max, linkFanHref, error, className } = props;
  const full = value.length >= max;
  return (
    <fieldset
      className={cn("m-0 flex flex-col gap-2 rounded-2xl border border-line bg-white p-[22px]", className)}
      aria-describedby="fans-hint"
    >
      <legend className="float-left pb-1 text-base font-semibold">Who&apos;s going?</legend>
      <span id="fans-hint" className="clear-both text-[13px] text-muted-ink">
        One ticket per Fan ID. Up to {max} per order.
      </span>
      {fans.map((fan) => {
        const checked = value.includes(fan.id);
        return (
          <FanOption
            key={fan.id}
            fan={fan}
            checked={checked}
            disabled={!checked && full}
            onCheckedChange={(on) => onValueChange(on ? [...value, fan.id] : value.filter((id) => id !== fan.id))}
          />
        );
      })}
      {error ? (
        <p role="alert" className="text-[13px] text-rose-ink">
          {error}
        </p>
      ) : null}
      {linkFanHref ? (
        <AppLink href={linkFanHref} tone="pitch" className="flex min-h-11 items-center text-sm">
          + Link another fan
        </AppLink>
      ) : null}
    </fieldset>
  );
}

/* ---------- OrderSummaryCard ---------- */

const ctaSchema = z.object({
  label: z.string().min(1),
  href: zHref.optional(),
  onClick: zFn<() => void>().optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
});

export const orderSummaryCardPropsSchema = z.object({
  lines: z.array(z.object({ label: z.string().min(1), amount: z.number() })),
  total: z.number().nonnegative(),
  cta: ctaSchema,
  note: z.string().optional(),
  error: z.string().optional(),
  children: zNode.optional(),
  className: zClassName,
});

export type OrderSummaryCardProps = z.input<typeof orderSummaryCardPropsSchema>;

function Cta({ cta }: { cta: z.infer<typeof ctaSchema> }) {
  if (cta.href && !cta.onClick) {
    return (
      <LinkButton href={cta.href} variant="primary" size="xl" block disabled={cta.disabled}>
        {cta.label}
      </LinkButton>
    );
  }
  return (
    <Button variant="primary" size="xl" block onClick={cta.onClick} disabled={cta.disabled} loading={cta.loading}>
      {cta.label}
    </Button>
  );
}

/** Organism · OrderSummaryCard — running total with the continue action. */
export function OrderSummaryCard(props: OrderSummaryCardProps) {
  validateProps("OrderSummaryCard", orderSummaryCardPropsSchema, props);
  const { lines, total, cta, note, error, children, className } = props;
  return (
    <section aria-label="Order summary" className={cn("flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px]", className)}>
      {children}
      {lines.map((line) => (
        <SummaryRow key={line.label} label={line.label} amount={line.amount} />
      ))}
      <SummaryRow label="Total" amount={total} variant="total" />
      {note ? <span className="text-[13px] text-muted-ink">{note}</span> : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-[13px] text-rose-ink">
          {error}
        </p>
      ) : null}
      <Cta cta={cta} />
    </section>
  );
}

/* ---------- StadiumBlockMap ---------- */

export const stadiumBlockMapPropsSchema = z.object({
  blocks: z.array(stadiumBlockSchema).length(16, { error: "A stadium has 16 blocks (4 per side)" }),
  value: z.string().min(1),
  onValueChange: zFn<(blockId: string) => void>(),
  className: zClassName,
});

export type StadiumBlockMapProps = z.input<typeof stadiumBlockMapPropsSchema>;

const blockPosition = (block: StadiumBlock) => {
  const i = Number(block.id[1]);
  switch (block.side) {
    case "N":
      return { gridColumn: `${i + 1} / ${i + 2}`, gridRow: "1 / 2" };
    case "S":
      return { gridColumn: `${i + 1} / ${i + 2}`, gridRow: "6 / 7" };
    case "W":
      return { gridColumn: "1 / 2", gridRow: `${i + 1} / ${i + 2}` };
    case "E":
      return { gridColumn: "6 / 7", gridRow: `${i + 1} / ${i + 2}` };
  }
};

/** Organism · StadiumBlockMap — pick a block; colour shows how many seats are left. */
export function StadiumBlockMap(props: StadiumBlockMapProps) {
  validateProps("StadiumBlockMap", stadiumBlockMapPropsSchema, props);
  const { blocks, value, onValueChange, className } = props;
  return (
    <section
      aria-labelledby="block-title"
      className={cn("flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-4 sm:p-[22px]", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Heading id="block-title" size="md">
          1 · Pick a block
        </Heading>
        <span className="text-[13px] text-muted-ink">Colour shows how many seats are left</span>
      </div>
      <div
        role="group"
        aria-label="Stadium blocks"
        className="grid grid-cols-[56px_repeat(4,minmax(0,1fr))_56px] grid-rows-[58px_repeat(4,54px)_58px] gap-1.5 sm:grid-cols-[76px_repeat(4,minmax(0,1fr))_76px]"
      >
        {blocks.map((block) => {
          const total = block.rows.reduce((n, r) => n + r.seats.length, 0);
          const left = countAvailable(block.rows);
          const ratio = left / total;
          const selected = block.id === value;
          const soldOut = left === 0;
          const tone = block.away
            ? "border border-dashed border-stone bg-paper text-sub"
            : soldOut
              ? "bg-line text-sub"
              : ratio < 0.15
                ? "bg-peach text-peach-ink"
                : ratio < 0.5
                  ? "bg-amber-soft text-amber-ink"
                  : "bg-mint text-pitch";
          return (
            <button
              key={block.id}
              type="button"
              aria-pressed={selected}
              disabled={block.away || soldOut}
              onClick={() => onValueChange(block.id)}
              aria-label={`Block ${block.id}, ${block.sideName}, ${block.away ? "away fans only" : soldOut ? "sold out" : `${left} seats left`}`}
              style={blockPosition(block)}
              className={cn(
                "flex flex-col items-center justify-center gap-px rounded-lg p-0.5 text-[13px] leading-tight font-semibold",
                tone,
                selected && "border-[3px] border-ink",
              )}
            >
              {block.id}
              <span className="text-[11px] font-medium">{block.away ? "Away" : soldOut ? "Sold out" : `${left} left`}</span>
            </button>
          );
        })}
        <div
          aria-hidden="true"
          className="relative col-[2/6] row-[2/6] flex items-center justify-center rounded-md border-[3px] border-white bg-forest"
        >
          <div className="size-[70px] rounded-full border-[3px] border-white" />
          <div className="absolute inset-y-0 left-1/2 border-l-[3px] border-white" />
          <div className="absolute inset-y-[30%] left-0 w-[34px] border-[3px] border-l-0 border-white" />
          <div className="absolute inset-y-[30%] right-0 w-[34px] border-[3px] border-r-0 border-white" />
        </div>
      </div>
      <Legend
        items={[
          { label: "Plenty left", swatch: { fill: "#D5E6DA" } },
          { label: "Filling up", swatch: { fill: "#FCE8A6" } },
          { label: "Almost gone", swatch: { fill: "#F2C29B" } },
          { label: "Sold out", swatch: { fill: "#D6D2C6" } },
          { label: "Away fans only", swatch: { fill: "#F3F1EA", border: "dashed", borderColor: "#8C8F88" } },
        ]}
      />
    </section>
  );
}

/* ---------- SeatMap ---------- */

export const seatCellSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  state: z.enum(seatStateValues),
  label: z.string().min(1),
  fill: zColor.optional(),
  edge: zColor.optional(),
  onFill: zColor.optional(),
  wide: z.boolean().optional(),
  dimmed: z.boolean().optional(),
});
export type SeatCell = z.infer<typeof seatCellSchema>;

export const seatRowGroupSchema = z.object({
  title: z.string().optional(),
  rows: z
    .array(z.object({ label: z.string().min(1), segments: z.array(z.array(seatCellSchema)).min(1), spaced: z.boolean().optional() }))
    .min(1),
});

export const seatMapPropsSchema = z.object({
  label: z.string().min(1),
  groups: z.array(seatRowGroupSchema).min(1),
  onToggle: zFn<(seatId: string) => void>(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  header: zNode.optional(),
  className: zClassName,
});

export type SeatMapProps = z.input<typeof seatMapPropsSchema>;

/**
 * Organism · SeatMap — rows of seats with aisles. One seat is tabbable at a time;
 * arrow keys move between seats (Home/End jump within a row).
 */
export function SeatMap(props: SeatMapProps) {
  validateProps("SeatMap", seatMapPropsSchema, props);
  const { label, groups, onToggle, size = "md", header, className } = props;
  const container = useRef<HTMLDivElement>(null);
  const grid = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.segments.flat())), [groups]);
  const all = useMemo(() => grid.flat(), [grid]);
  const [focusId, setFocusId] = useState<string>();
  const tabbableId =
    (focusId && all.some((s) => s.id === focusId) ? focusId : undefined) ??
    all.find((s) => s.state === "selected")?.id ??
    all.find((s) => s.state !== "taken")?.id ??
    all[0]?.id;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const id = (event.target as HTMLElement).dataset.seatId;
    if (!id) return;
    const r = grid.findIndex((row) => row.some((s) => s.id === id));
    const c = grid[r]?.findIndex((s) => s.id === id) ?? -1;
    if (r < 0 || c < 0) return;
    let next: SeatCell | undefined;
    const row = grid[r]!;
    switch (event.key) {
      case "ArrowRight":
        next = row[c + 1];
        break;
      case "ArrowLeft":
        next = row[c - 1];
        break;
      case "ArrowDown":
        next = grid[r + 1]?.[Math.min(c, (grid[r + 1]?.length ?? 1) - 1)];
        break;
      case "ArrowUp":
        next = grid[r - 1]?.[Math.min(c, (grid[r - 1]?.length ?? 1) - 1)];
        break;
      case "Home":
        next = row[0];
        break;
      case "End":
        next = row[row.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (!next) return;
    setFocusId(next.id);
    container.current?.querySelector<HTMLButtonElement>(`[data-seat-id="${CSS.escape(next.id)}"]`)?.focus();
  };

  const gap = size === "lg" ? "gap-[22px]" : "gap-4";
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {header}
      <p id="seatmap-help" className="sr-only">
        Use the arrow keys to move between seats and Enter or Space to choose a seat.
      </p>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard delegation for the seat buttons inside */}
      <div
        ref={container}
        role="group"
        aria-label={label}
        aria-describedby="seatmap-help"
        onKeyDown={onKeyDown}
        className="flex flex-col items-center gap-[18px] overflow-x-auto pb-1"
      >
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className="flex flex-col items-center gap-1">
            {group.title ? <div className="pb-1 font-mono text-xs tracking-[0.1em] text-muted-ink">{group.title}</div> : null}
            {group.rows.map((row) => (
              <div
                key={row.label}
                role="group"
                aria-label={`Row ${row.label}`}
                className={cn("flex items-center", gap, row.spaced && "mt-3.5")}
              >
                <span aria-hidden="true" className="w-[18px] text-center font-mono text-xs text-muted-ink">
                  {row.label}
                </span>
                {row.segments.map((segment, si) => (
                  <div key={si} className={cn("flex", size === "sm" ? "gap-[3px]" : size === "md" ? "gap-1" : "gap-1.5")}>
                    {segment.map((seat) => (
                      <Seat
                        key={seat.id}
                        seatId={seat.id}
                        state={seat.state}
                        number={seat.number}
                        label={seat.label}
                        size={size}
                        wide={seat.wide}
                        fill={seat.fill}
                        edge={seat.edge}
                        onFill={seat.onFill}
                        dimmed={seat.dimmed}
                        tabIndex={seat.id === tabbableId ? 0 : -1}
                        onToggle={() => {
                          setFocusId(seat.id);
                          onToggle(seat.id);
                        }}
                      />
                    ))}
                  </div>
                ))}
                <span aria-hidden="true" className="w-[18px] text-center font-mono text-xs text-muted-ink">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- PickedSeatsPanel ---------- */

export const pickedSeatsPanelPropsSchema = z.object({
  title: z.string().min(1),
  countLabel: z.string().min(1),
  emptyText: z.string().min(1),
  seats: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), detail: z.string().min(1) })),
  onRemove: zFn<(seatId: string) => void>(),
  message: z.string().optional(),
  feeLabel: z.string().min(1).optional(),
  fees: z.number().nonnegative(),
  total: z.number().nonnegative(),
  cta: ctaSchema,
  prefix: zNode.optional(),
  showSwatch: z.boolean().optional(),
  className: zClassName,
});

export type PickedSeatsPanelProps = z.input<typeof pickedSeatsPanelPropsSchema>;

/** Organism · PickedSeatsPanel — chosen seats, validation message, fees and total. */
export function PickedSeatsPanel(props: PickedSeatsPanelProps) {
  validateProps("PickedSeatsPanel", pickedSeatsPanelPropsSchema, props);
  const {
    title,
    countLabel,
    emptyText,
    seats,
    onRemove,
    message,
    feeLabel = "Service fee",
    fees,
    total,
    cta,
    prefix,
    showSwatch,
    className,
  } = props;
  return (
    <section
      aria-labelledby="picked-title"
      className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]", className)}
    >
      {prefix}
      <div className="flex items-baseline justify-between">
        <h2 id="picked-title" className="text-lg font-semibold">
          {title}
        </h2>
        <span className="text-[13px] text-muted-ink" aria-live="polite">
          {countLabel}
        </span>
      </div>
      {seats.length === 0 ? (
        <p className="rounded-[10px] bg-paper p-3.5 text-sm leading-normal text-muted-ink">{emptyText}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {seats.map((seat) => (
            <PickedSeatRow
              key={seat.id}
              label={seat.label}
              detail={seat.detail}
              onRemove={() => onRemove(seat.id)}
              showSwatch={showSwatch}
            />
          ))}
        </ul>
      )}
      {message ? (
        <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-[13px] text-rose-ink">
          {message}
        </p>
      ) : null}
      <div className="flex justify-between border-t border-line pt-2.5 text-sm">
        <span>{feeLabel}</span>
        <span className="font-mono">{formatMoney(fees)}</span>
      </div>
      <SummaryRow label="Total" amount={total} variant="total" className="border-0 pt-0" />
      <Cta cta={cta} />
    </section>
  );
}

/* ---------- ArenaMap ---------- */

export const arenaMapPropsSchema = z.object({
  ticketTypes: z.array(ticketTypeSchema).min(1),
  focusedId: z.string().optional(),
  onFocusChange: zFn<(id: string) => void>(),
  note: z.string().optional(),
  className: zClassName,
});

export type ArenaMapProps = z.input<typeof arenaMapPropsSchema>;

const arenaAreas: Record<string, { area: string; light?: boolean }[]> = {
  sa: [{ area: "col-[1/2] row-[1/3]" }, { area: "col-[3/4] row-[1/3]" }],
  gc: [{ area: "col-[2/3] row-[1/2]", light: true }],
  ga: [{ area: "col-[2/3] row-[2/3]", light: true }],
  sb: [{ area: "col-[1/4] row-[3/4]" }],
  vip: [{ area: "col-[1/4] row-[4/5]", light: true }],
};

/** Organism · ArenaMap — tap an area to focus its ticket type. */
export function ArenaMap(props: ArenaMapProps) {
  validateProps("ArenaMap", arenaMapPropsSchema, props);
  const { ticketTypes, focusedId, onFocusChange, note, className } = props;
  return (
    <section
      aria-labelledby="venue-map-title"
      className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-6", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading as="h1" id="venue-map-title" size="xl">
          Venue map
        </Heading>
        <span className="text-sm text-muted-ink">Tap an area to see its tickets</span>
      </div>
      <div
        aria-hidden="true"
        className="flex h-[52px] items-center justify-center rounded-[10px] bg-ink font-display text-[22px] font-extrabold tracking-[0.2em] text-white"
      >
        STAGE
      </div>
      <div
        role="group"
        aria-label="Venue areas"
        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] grid-rows-[120px_170px_90px_64px] gap-2"
      >
        {ticketTypes.flatMap((type) =>
          (arenaAreas[type.id] ?? []).map((spot, i) => (
            <button
              key={`${type.id}-${i}`}
              type="button"
              aria-pressed={focusedId === type.id}
              onClick={() => onFocusChange(type.id)}
              style={{ backgroundColor: type.swatch }}
              className={cn(
                "rounded-xl border-4 px-1 text-sm font-semibold sm:text-[15px]",
                spot.area,
                spot.light ? "text-white" : "text-ink",
                focusedId === type.id ? "border-gold" : "border-transparent",
              )}
            >
              {type.mapLabel}
            </button>
          )),
        )}
      </div>
      {note ? <p className="text-[13px] text-muted-ink">{note}</p> : null}
    </section>
  );
}

/* ---------- TicketTypePicker ---------- */

export const ticketTypePickerPropsSchema = z
  .object({
    ticketTypes: z.array(ticketTypeSchema).min(1),
    quantities: z.record(z.string(), z.number().int().min(0)),
    onQuantitiesChange: zFn<(quantities: Record<string, number>) => void>(),
    max: z.number().int().positive(),
    focusedId: z.string().optional(),
    onFocusChange: zFn<(id: string) => void>().optional(),
    className: zClassName,
  })
  .refine((p) => Object.values(p.quantities).reduce((a, b) => a + b, 0) <= p.max, {
    error: "Quantities exceed the order maximum",
    path: ["quantities"],
  });

export type TicketTypePickerProps = z.input<typeof ticketTypePickerPropsSchema>;

/** Organism · TicketTypePicker — quantity per ticket type within the order limit. */
export function TicketTypePicker(props: TicketTypePickerProps) {
  validateProps("TicketTypePicker", ticketTypePickerPropsSchema, props);
  const { ticketTypes, quantities, onQuantitiesChange, max, focusedId, onFocusChange, className } = props;
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);
  return (
    <section aria-label="Ticket types" className={cn("flex flex-col gap-2 rounded-2xl border border-line bg-white p-[18px]", className)}>
      {ticketTypes.map((type) => {
        const qty = quantities[type.id] ?? 0;
        return (
          <TicketTypeRow
            key={type.id}
            ticketType={type}
            quantity={qty}
            focused={focusedId === type.id}
            onFocus={onFocusChange ? () => onFocusChange(type.id) : undefined}
            canIncrease={count < max && qty < type.remaining}
            onQuantityChange={(next) => onQuantitiesChange({ ...quantities, [type.id]: next })}
          />
        );
      })}
    </section>
  );
}

/* ---------- ShowtimePicker ---------- */

export const showtimePickerPropsSchema = z
  .object({
    showtimes: z.array(showtimeSchema).min(1),
    value: z.string().min(1),
    onValueChange: zFn<(showtimeId: string) => void>(),
    className: zClassName,
  })
  .refine((p) => p.showtimes.some((s) => s.id === p.value), { error: "value must be one of the showtimes", path: ["value"] });

export type ShowtimePickerProps = z.input<typeof showtimePickerPropsSchema>;

/** Organism · ShowtimePicker — day then time, with format and availability. */
export function ShowtimePicker(props: ShowtimePickerProps) {
  validateProps("ShowtimePicker", showtimePickerPropsSchema, props);
  const { showtimes, value, onValueChange, className } = props;
  const current = showtimes.find((s) => s.id === value)!;
  const days = [...new Map(showtimes.map((s) => [s.date, s])).values()];
  const times = showtimes.filter((s) => s.date === current.date);
  return (
    <section
      aria-labelledby="showtime-title"
      className={cn("flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-4 sm:p-[22px]", className)}
    >
      <Heading id="showtime-title" size="md">
        1 · Day &amp; showtime
      </Heading>
      <div role="group" aria-label="Day" className="flex flex-wrap gap-2">
        {days.map((day) => {
          const on = day.date === current.date;
          return (
            <button
              key={day.date}
              type="button"
              aria-pressed={on}
              aria-label={`${day.dayLabel} ${day.dayNumber}`}
              onClick={() => onValueChange(showtimes.find((s) => s.date === day.date)!.id)}
              className={cn(
                "flex h-16 w-[76px] flex-col items-center justify-center gap-0.5 rounded-[10px] border",
                on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink",
              )}
            >
              <span className="text-xs">{day.dayLabel}</span>
              <span className="font-display text-2xl leading-none font-extrabold">{day.dayNumber}</span>
            </button>
          );
        })}
      </div>
      <div role="group" aria-label="Showtime" className="flex flex-wrap gap-2">
        {times.map((time) => {
          const on = time.id === value;
          const availTone = on
            ? "text-sand"
            : time.availability === "almost_full"
              ? "text-rose-ink"
              : time.availability === "filling"
                ? "text-warn"
                : "text-pitch";
          return (
            <button
              key={time.id}
              type="button"
              aria-pressed={on}
              aria-label={`${time.time} ${time.format}, ${time.availabilityLabel}`}
              onClick={() => onValueChange(time.id)}
              className={cn(
                "flex h-16 min-w-[120px] flex-col items-start justify-center gap-0.5 rounded-[10px] border px-3.5",
                on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink",
              )}
            >
              <span className="text-[17px] font-semibold">
                {time.time}{" "}
                <span
                  className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink", time.format === "IMAX" ? "bg-gold" : "bg-sand")}
                >
                  {time.format}
                </span>
              </span>
              <span className={cn("text-xs", availTone)}>{time.availabilityLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- TierPriceList ---------- */

export const tierPriceListPropsSchema = z.object({ tiers: z.array(hallTierSchema).min(1), className: zClassName });
export type TierPriceListProps = z.input<typeof tierPriceListPropsSchema>;

/** Organism · TierPriceList — colour key with prices for priced seat maps. */
export function TierPriceList(props: TierPriceListProps) {
  validateProps("TierPriceList", tierPriceListPropsSchema, props);
  const { tiers, className } = props;
  return (
    <section
      aria-labelledby="prices-title"
      className={cn("flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px]", className)}
    >
      <h2 id="prices-title" className="text-lg font-semibold">
        Prices
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {tiers.map((tier) => (
          <li key={tier.id} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="size-[22px] shrink-0 rounded-[6px_6px_3px_3px] border"
              style={{ backgroundColor: tier.swatch, borderColor: tier.edge }}
            />
            <span className="flex-1">
              <strong>{tier.name}</strong> · {tier.where}
            </span>
            <span className="font-mono">{formatMoney(tier.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
