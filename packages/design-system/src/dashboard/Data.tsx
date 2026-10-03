import { kpiSchema, type EntryScan, type EventRequest, type Kpi, type Payout, type RefundReview } from "@repo/contracts";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import type { BadgeTone } from "../atoms/Badge";
import { useI18n, useUI } from "../lib/provider";
import { validateProps, zClassName, zNode } from "../lib/props";
import { cn } from "../lib/utils";

/* ---------- Status tones (shared by tables and cards) ---------- */

export const orderStatusTone: Record<string, BadgeTone> = {
  paid: "success",
  pending_payment: "warning",
  payment_failed: "danger",
  expired: "neutral",
};
export const refundStatusTone: Record<RefundReview["status"], BadgeTone> = {
  in_review: "warning",
  refunded: "success",
  rejected: "danger",
  cancelled: "neutral",
};
export const payoutStatusTone: Record<Payout["status"], BadgeTone> = { scheduled: "info", paid: "success" };
export const requestStatusTone: Record<EventRequest["status"], BadgeTone> = { pending: "warning", approved: "success", rejected: "danger" };
export const scanResultTone: Record<EntryScan["result"], BadgeTone> = {
  admitted: "success",
  already_used: "danger",
  expired: "warning",
  invalid: "danger",
  not_valid: "danger",
};

/* ---------- KPI cards ---------- */

export const kpiCardPropsSchema = z.object({ kpi: kpiSchema, className: zClassName });
export type KpiCardProps = z.input<typeof kpiCardPropsSchema>;

/** Formats a KPI value the way its card shows it. */
export function useKpiValue() {
  const { f } = useI18n();
  return (kpi: Pick<Kpi, "value" | "format">) =>
    kpi.format === "money"
      ? f.money(kpi.value)
      : kpi.format === "percent"
        ? `${f.number(Math.round(kpi.value * 100))}%`
        : f.number(kpi.value);
}

/**
 * Molecule · KpiCard — one headline number: label, value and its change against the previous seven days.
 * The change carries an arrow and a sign as well as colour, so it never relies on colour alone.
 */
export function KpiCard(props: KpiCardProps) {
  validateProps("KpiCard", kpiCardPropsSchema, props);
  const { kpi, className } = props;
  const { t, f } = useI18n();
  const value = useKpiValue();
  const change = kpi.change;
  const up = change !== undefined && change >= 0;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-white p-4 sm:p-5", className)}>
      <span className="text-sm text-muted-ink">{kpi.label}</span>
      <span className="text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">{value(kpi)}</span>
      {change !== undefined ? (
        <span className="flex flex-wrap items-center gap-1 text-[13px] text-muted-ink">
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-pitch" : "text-rose-ink")}>
            {up ? <ArrowUpRight className="size-4" aria-hidden="true" /> : <ArrowDownRight className="size-4" aria-hidden="true" />}
            <bdi>
              {up ? "+" : "−"}
              {f.number(Math.abs(Math.round(change * 100)))}%
            </bdi>
          </span>
          {t("vs previous 7 days")}
        </span>
      ) : kpi.hint ? (
        <span className="text-[13px] text-muted-ink">{kpi.hint}</span>
      ) : null}
    </div>
  );
}

export const kpiGridPropsSchema = z.object({ kpis: z.array(kpiSchema), className: zClassName });
export type KpiGridProps = z.input<typeof kpiGridPropsSchema>;

/** Organism · KpiGrid — the row of headline numbers at the top of a dashboard. */
export function KpiGrid(props: KpiGridProps) {
  validateProps("KpiGrid", kpiGridPropsSchema, props);
  const { kpis, className } = props;
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-3", className)}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

/* ---------- Task list ---------- */

export const taskListPropsSchema = z.object({
  tasks: z.array(z.object({ id: z.string(), label: z.string().min(1), count: z.number().int().nonnegative(), href: z.string().min(1) })),
  className: zClassName,
});
export type TaskListProps = z.input<typeof taskListPropsSchema>;

/** Molecule · TaskList — waiting work with counts, each a link to its queue. */
export function TaskList(props: TaskListProps) {
  validateProps("TaskList", taskListPropsSchema, props);
  const { tasks, className } = props;
  const { LinkComponent, t, f } = useUI();
  if (tasks.length === 0) return null;
  return (
    <ul className={cn("m-0 flex list-none flex-col divide-y divide-line rounded-xl border border-line bg-white p-0", className)}>
      {tasks.map((task) => (
        <li key={task.id}>
          <LinkComponent href={task.href} className="flex min-h-14 items-center gap-3 px-4 text-ink no-underline hover:bg-paper">
            <span
              className={cn(
                "inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold",
                task.count > 0 ? "bg-gold text-ink" : "bg-sand text-muted-ink",
              )}
            >
              {f.number(task.count)}
            </span>
            <span className="flex-1 font-medium">{task.label}</span>
            <span className="text-[13px] text-muted-ink">{task.count > 0 ? t("Open") : t("All clear")}</span>
            <ChevronRight className="size-4 text-muted-ink rtl:-scale-x-100" aria-hidden="true" />
          </LinkComponent>
        </li>
      ))}
    </ul>
  );
}

/* ---------- DataTable ---------- */

export type DataColumn<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Numbers line up on the end edge (right in English, left in Arabic). */
  align?: "start" | "end";
  /** Hidden below this width to keep the table readable on phones. */
  hideBelow?: "sm" | "md" | "lg";
  className?: string;
};

export const dataTablePropsSchema = z.object({
  caption: z.string().min(1),
  columns: z.array(z.object({ id: z.string().min(1), header: z.string() }).loose()).min(1),
  rows: z.array(z.unknown()),
  rowKey: z.custom<(row: never) => string>((v) => typeof v === "function"),
  empty: zNode.optional(),
  /** Keeps the previous rows visible (dimmed) while new ones load. */
  refreshing: z.boolean().optional(),
  className: zClassName,
});
export type DataTableProps<Row> = Omit<z.input<typeof dataTablePropsSchema>, "columns" | "rows" | "rowKey"> & {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
};

const hideBelow = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;

/**
 * Organism · DataTable — a real `<table>` with a caption, sticky header, numbers aligned to the end
 * edge (tabular figures) and an empty state. Scrolls sideways inside its card on narrow screens.
 */
export function DataTable<Row>(props: DataTableProps<Row>) {
  validateProps("DataTable", dataTablePropsSchema, props);
  const { caption, columns, rows, rowKey, empty, refreshing, className } = props;
  const { t } = useI18n();
  return (
    <div
      className={cn("overflow-x-auto rounded-xl border border-line bg-white transition-opacity", refreshing && "opacity-60", className)}
      aria-busy={refreshing || undefined}
    >
      <table className="w-full border-collapse text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-paper/60">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  "px-4 py-3 text-[12px] font-semibold tracking-[0.06em] whitespace-nowrap text-muted-ink uppercase",
                  col.align === "end" ? "text-end" : "text-start",
                  col.hideBelow && hideBelow[col.hideBelow],
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-ink">
                {empty ?? t("Nothing to show yet")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-b-0 hover:bg-paper/50">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-4 py-3 align-middle",
                      col.align === "end" ? "text-end tabular-nums" : "text-start",
                      col.hideBelow && hideBelow[col.hideBelow],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- FilterBar ---------- */

export const filterBarPropsSchema = z.object({ children: zNode, className: zClassName });
export type FilterBarProps = z.input<typeof filterBarPropsSchema>;

/** Molecule · FilterBar — one row of filters above the content they scope. */
export function FilterBar(props: FilterBarProps) {
  validateProps("FilterBar", filterBarPropsSchema, props);
  return <div className={cn("flex flex-wrap items-center gap-3", props.className)}>{props.children}</div>;
}

/* ---------- Panel ---------- */

export const panelPropsSchema = z.object({
  title: z.string().min(1),
  description: zNode.optional(),
  action: zNode.optional(),
  children: zNode,
  className: zClassName,
});
export type PanelProps = z.input<typeof panelPropsSchema>;

/** Molecule · Panel — a titled dashboard section (chart, list or table). */
export function Panel(props: PanelProps) {
  validateProps("Panel", panelPropsSchema, props);
  const { title, description, action, children, className } = props;
  return (
    <section aria-label={title} className={cn("flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {description ? <p className="text-[13px] text-muted-ink">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
