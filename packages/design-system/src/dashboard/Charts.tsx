import { salesPointSchema, type SalesPoint } from "@repo/contracts";
import { useId, useState } from "react";
import { z } from "zod";
import { useI18n } from "../lib/provider";
import { validateProps, zClassName } from "../lib/props";
import { cn } from "../lib/utils";

/**
 * Dashboard charts. One series each, so the panel title names what is plotted and there is no legend.
 * Marks use the brand green (`pitch`, 10:1 on white); text always wears ink tokens, never the mark colour.
 * Every value is also reachable without hovering: the latest value is labelled, and each chart has a
 * table view.
 */

/** Rounds a maximum up to a clean axis value (1, 2, 2.5 or 5 × 10ⁿ). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * magnitude >= value) return step * magnitude;
  return 10 * magnitude;
}

/* ---------- SalesChart ---------- */

export const salesChartPropsSchema = z.object({
  points: z.array(salesPointSchema).min(1),
  metric: z.enum(["revenue", "tickets"]).optional(),
  /** Names the chart for screen readers and the table caption. */
  label: z.string().min(1),
  className: zClassName,
});
export type SalesChartProps = z.input<typeof salesChartPropsSchema>;

/**
 * Organism · SalesChart — daily sales as columns (≤ 24px, rounded data end, 2px gaps) on a recessive
 * hairline grid. Hover or focus a day for its revenue and tickets; the latest day is labelled on its cap.
 */
export function SalesChart(props: SalesChartProps) {
  validateProps("SalesChart", salesChartPropsSchema, props);
  const { points, metric = "revenue", label, className } = props;
  const { t, f } = useI18n();
  const [active, setActive] = useState<number>();
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const value = (p: SalesPoint) => (metric === "revenue" ? p.revenue : p.tickets);
  const format = (n: number) => (metric === "revenue" ? f.money(n) : f.number(n));
  const compact = (n: number) => (metric === "revenue" && n >= 1000 ? `${f.number(Math.round(n / 100) / 10)}${t("K")}` : f.number(n));
  const max = niceMax(Math.max(...points.map(value)));
  const ticks = [max, max / 2, 0];
  const last = points.length - 1;
  const date = (p: SalesPoint) => f.shortDateLabel(`${p.date}T12:00:00Z`);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        {/* Y axis */}
        <div className="relative h-[220px] min-w-10 text-[11px] text-muted-ink tabular-nums" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="absolute end-0 -translate-y-1/2" style={{ top: `${(1 - tick / max) * 100}%` }}>
              {compact(tick)}
            </span>
          ))}
        </div>
        {/* Plot */}
        <div className="relative h-[220px]">
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-chalk"
              style={{ top: `${(1 - tick / max) * 100}%` }}
            />
          ))}
          <ul
            aria-label={label}
            className="absolute inset-0 m-0 flex list-none items-end gap-[2px] p-0"
            onPointerLeave={() => setActive(undefined)}
          >
            {points.map((p, i) => {
              const v = value(p);
              const height = (v / max) * 100;
              const isActive = active === i;
              return (
                <li key={p.date} className="relative flex h-full flex-1 justify-center">
                  <button
                    type="button"
                    className="group flex h-full w-full cursor-default items-end justify-center outline-none"
                    aria-label={`${date(p)}: ${f.money(p.revenue)}, ${t("{count, plural, one {# ticket} other {# tickets}}", { count: p.tickets })}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(undefined)}
                  >
                    <span
                      className={cn(
                        "block w-full max-w-6 rounded-t-[4px] bg-pitch transition-opacity group-focus-visible:outline-[3px] group-focus-visible:outline-offset-2 group-focus-visible:outline-gold",
                        active !== undefined && !isActive && "opacity-45",
                      )}
                      style={{ height: `max(${height}%, ${v > 0 ? 2 : 0}px)` }}
                    />
                  </button>
                  {i === last && active === undefined ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -translate-y-full pb-1 text-[12px] font-semibold whitespace-nowrap text-ink"
                      style={{ bottom: `${height}%` }}
                    >
                      {compact(v)}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute z-10 flex -translate-y-full flex-col gap-0.5 rounded-lg border border-line bg-white px-3 py-2 text-start whitespace-nowrap shadow-md",
                        i > points.length / 2 ? "end-0" : "start-0",
                      )}
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <span className="text-[15px] font-semibold text-ink">{format(v)}</span>
                      <span className="text-[12px] text-muted-ink">
                        {date(p)} ·{" "}
                        {metric === "revenue"
                          ? t("{count, plural, one {# ticket} other {# tickets}}", { count: p.tickets })
                          : f.money(p.revenue)}
                      </span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
        {/* X axis */}
        <span aria-hidden="true" />
        <div className="flex gap-[2px] pt-1.5 text-[11px] text-muted-ink" aria-hidden="true">
          {points.map((p, i) => (
            <span key={p.date} className="flex-1 text-center whitespace-nowrap">
              {i === 0 || i === last ? date(p) : i % 2 === last % 2 ? f.dayOfMonth(`${p.date}T12:00:00Z`) : ""}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((s) => !s)}
        className="self-start text-[13px] font-semibold text-pitch underline underline-offset-4"
      >
        {showTable ? t("Hide table") : t("Show as table")}
      </button>
      <div id={tableId} hidden={!showTable} className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-line text-muted-ink">
              <th scope="col" className="py-2 text-start font-semibold">
                {t("Day")}
              </th>
              <th scope="col" className="py-2 text-end font-semibold">
                {t("Revenue")}
              </th>
              <th scope="col" className="py-2 text-end font-semibold">
                {t("Tickets")}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-b border-line last:border-0">
                <th scope="row" className="py-1.5 text-start font-normal">
                  {date(p)}
                </th>
                <td className="py-1.5 text-end tabular-nums">{f.money(p.revenue)}</td>
                <td className="py-1.5 text-end tabular-nums">{f.number(p.tickets)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- CapacityBars ---------- */

export const capacityBarsPropsSchema = z.object({
  label: z.string().min(1),
  rows: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      value: z.number().nonnegative(),
      max: z.number().positive(),
      /** Extra text after the counts (price, revenue…). */
      detail: z.string().optional(),
    }),
  ),
  /** Wording of the counts: "1,200 of 1,500 sold". */
  unit: z.enum(["sold", "checked_in"]).optional(),
  className: zClassName,
});
export type CapacityBarsProps = z.input<typeof capacityBarsPropsSchema>;

/**
 * Molecule · CapacityBars — how full each zone (or gate) is: a meter per row with a lighter track of the
 * same green, and the counts and percentage written out beside it.
 */
export function CapacityBars(props: CapacityBarsProps) {
  validateProps("CapacityBars", capacityBarsPropsSchema, props);
  const { label, rows, unit = "sold", className } = props;
  const { t, f } = useI18n();
  return (
    <ul aria-label={label} className={cn("m-0 flex list-none flex-col gap-3.5 p-0", className)}>
      {rows.map((row) => {
        const share = Math.min(1, row.value / row.max);
        const counts =
          unit === "sold"
            ? t("{sold} of {capacity} sold", { sold: f.number(row.value), capacity: f.number(row.max) })
            : t("{count} of {total} in", { count: f.number(row.value), total: f.number(row.max) });
        return (
          <li key={row.id} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
              <span className="font-semibold">{row.label}</span>
              <span className="text-muted-ink tabular-nums">
                {counts} · <bdi>{f.number(Math.round(share * 100))}%</bdi>
                {row.detail ? ` · ${row.detail}` : ""}
              </span>
            </div>
            <span
              role="meter"
              aria-label={row.label}
              aria-valuemin={0}
              aria-valuemax={row.max}
              aria-valuenow={row.value}
              aria-valuetext={counts}
              className="block h-2.5 overflow-hidden rounded-full bg-mint"
            >
              <span className="block h-full rounded-full bg-pitch" style={{ width: `${share * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
