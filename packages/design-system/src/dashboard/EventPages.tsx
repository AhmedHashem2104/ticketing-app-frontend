import {
  entrySummarySchema,
  entryScanSchema,
  eventPerformanceSchema,
  eventReportSchema,
  overviewSchema,
  staffRoleSchema,
  type EventPerformance,
  type EventStatusChange,
  type Kpi,
} from "@repo/contracts";
import { msg } from "@repo/i18n";
import { ArrowLeft, ScanLine } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge, saleStatusTone } from "../atoms/Badge";
import { Button, LinkButton } from "../atoms/Button";
import { NativeSelect } from "../atoms/FormControls";
import { Thumbnail } from "../atoms/Media";
import { DetailList, Notice } from "../molecules/Content";
import { SearchField } from "../molecules/Form";
import { ChipGroup } from "../molecules/Navigation";
import { useI18n, useUI } from "../lib/provider";
import { validateProps, zClassName, zFn } from "../lib/props";
import { cn } from "../lib/utils";
import { CapacityBars, SalesChart } from "./Charts";
import { DataTable, FilterBar, KpiGrid, Panel, TaskList, type DataColumn } from "./Data";
import { ActionDialog, ScanPanel, ScanResultBadge } from "./Reviews";
import { DashboardPageHeader } from "./Shell";

/* ---------- Shared cells ---------- */

/** Event photo, title and date — the first cell of event tables. */
export function EventCell({ event, href }: { event: Pick<EventPerformance, "title" | "imageUrl" | "startsAt" | "venue">; href?: string }) {
  const { LinkComponent, f } = useUI();
  const title = <span className="font-semibold text-ink">{event.title}</span>;
  return (
    <span className="flex min-w-[220px] items-center gap-3">
      <Thumbnail src={event.imageUrl} size="sm" />
      <span className="flex min-w-0 flex-col">
        {href ? (
          <LinkComponent href={href} className="no-underline hover:underline">
            {title}
          </LinkComponent>
        ) : (
          title
        )}
        <span className="text-[12px] text-muted-ink">
          {f.dateTimeLabel(event.startsAt)} · {event.venue}
        </span>
      </span>
    </span>
  );
}

function SoldCell({ sold, capacity }: { sold: number; capacity: number }) {
  const { f } = useI18n();
  const share = Math.min(1, sold / capacity);
  return (
    <span className="ms-auto flex w-[130px] flex-col items-end gap-1">
      <span className="tabular-nums">
        {f.number(sold)} <span className="text-muted-ink">/ {f.number(capacity)}</span>
      </span>
      <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-mint">
        <span className="block h-full rounded-full bg-pitch" style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  );
}

function useEventColumns(options: { organizer?: boolean } = {}): DataColumn<EventPerformance>[] {
  const { t, f } = useI18n();
  return [
    { id: "event", header: t("Event"), cell: (e) => <EventCell event={e} href={`/events/${e.eventId}`} /> },
    ...(options.organizer
      ? [{ id: "organizer", header: t("Organiser"), hideBelow: "lg" as const, cell: (e: EventPerformance) => e.organizerName }]
      : []),
    { id: "status", header: t("Status"), cell: (e) => <Badge tone={saleStatusTone[e.status]}>{e.statusLabel}</Badge> },
    { id: "sold", header: t("Sold"), align: "end", cell: (e) => <SoldCell sold={e.sold} capacity={e.capacity} /> },
    { id: "revenue", header: t("Revenue"), align: "end", hideBelow: "md", cell: (e) => f.money(e.revenue) },
    { id: "checked", header: t("Checked in"), align: "end", hideBelow: "lg", cell: (e) => f.number(e.checkedIn) },
  ];
}

/* ---------- OverviewPage ---------- */

export const overviewPagePropsSchema = z.object({
  overview: overviewSchema,
  staffName: z.string().min(1),
  viewerRole: staffRoleSchema,
  refreshing: z.boolean().optional(),
  className: zClassName,
});
export type OverviewPageProps = z.input<typeof overviewPagePropsSchema>;

/** Page · Overview — headline numbers, two weeks of sales, waiting work and the best-selling events. */
export function OverviewPage(props: OverviewPageProps) {
  validateProps("OverviewPage", overviewPagePropsSchema, props);
  const { overview, staffName, viewerRole: role, refreshing, className } = props;
  const { t } = useI18n();
  const columns = useEventColumns({ organizer: role !== "organizer" });
  const firstName = staffName.split(" ")[0]!;
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <DashboardPageHeader
        title={t("Hello, {name}", { name: firstName })}
        description={
          role === "organizer"
            ? t("Sales, entry and payouts for your events.")
            : role === "operations"
              ? t("Today's queues and how sales are going.")
              : t("Everything happening on Matchpass, at a glance.")
        }
      />
      <KpiGrid kpis={overview.kpis} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={t("Ticket revenue, last 14 days")} description={t("Hover or focus a day for its numbers.")}>
          <SalesChart points={overview.sales} label={t("Ticket revenue, last 14 days")} />
        </Panel>
        {overview.tasks.length ? (
          <Panel title={t("Waiting for you")}>
            <TaskList tasks={overview.tasks} />
          </Panel>
        ) : null}
      </div>
      <Panel title={t("Top events by revenue")}>
        <DataTable
          caption={t("Top events by revenue")}
          columns={columns}
          rows={overview.topEvents}
          rowKey={(e) => e.eventId}
          refreshing={refreshing}
          className="-mx-4 rounded-none border-x-0 sm:-mx-5"
        />
      </Panel>
    </div>
  );
}

/* ---------- EventsPage ---------- */

export const eventsPagePropsSchema = z.object({
  events: z.array(eventPerformanceSchema),
  viewerRole: staffRoleSchema,
  query: z.string(),
  onQueryChange: zFn<(query: string) => void>(),
  status: z.enum(["all", "selling", "sold_out", "changed"]),
  onStatusChange: zFn<(status: "all" | "selling" | "sold_out" | "changed") => void>(),
  refreshing: z.boolean().optional(),
  className: zClassName,
});
export type EventsPageProps = z.input<typeof eventsPagePropsSchema>;

const EVENT_FILTERS = [
  { value: "all", label: msg("All") },
  { value: "selling", label: msg("Selling") },
  { value: "sold_out", label: msg("Sold out") },
  { value: "changed", label: msg("Postponed or cancelled") },
] as const;

/** Which filter chip an event falls under. */
export function eventFilterOf(event: Pick<EventPerformance, "status">): "selling" | "sold_out" | "changed" | "other" {
  if (event.status === "sold_out") return "sold_out";
  if (event.status === "postponed" || event.status === "cancelled") return "changed";
  if (event.status === "coming_soon") return "other";
  return "selling";
}

/** Page · Events — every event the role can see, with sales against capacity. */
export function EventsPage(props: EventsPageProps) {
  validateProps("EventsPage", eventsPagePropsSchema, props);
  const { events, viewerRole: role, query, onQueryChange, status, onStatusChange, refreshing, className } = props;
  const { t } = useI18n();
  const columns = useEventColumns({ organizer: role !== "organizer" });
  const q = query.trim().toLowerCase();
  const rows = events.filter(
    (e) =>
      (status === "all" || eventFilterOf(e) === status) &&
      (!q || [e.title, e.venue, e.organizerName].some((v) => v.toLowerCase().includes(q))),
  );
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader
        title={t("Events")}
        description={role === "organizer" ? t("Your events, their sales and entry.") : t("Every event on sale, coming up or changed.")}
      />
      <FilterBar>
        <SearchField
          label={t("Search events")}
          placeholder={t("Event, venue or organiser")}
          value={query}
          onValueChange={onQueryChange}
          className="w-full sm:w-80"
        />
        <ChipGroup
          label={t("Filter by status")}
          size="sm"
          value={status}
          onValueChange={(v) => onStatusChange(v as EventsPageProps["status"])}
          options={EVENT_FILTERS.map((o) => ({ value: o.value, label: t(o.label) }))}
        />
      </FilterBar>
      <DataTable
        caption={t("Events")}
        columns={columns}
        rows={rows}
        rowKey={(e) => e.eventId}
        refreshing={refreshing}
        empty={t("No events match these filters.")}
      />
    </div>
  );
}

/* ---------- EventReportPage ---------- */

type ReportAction = "postpone" | "cancel" | "reopen" | "request_cancel" | "request_postpone";

export const eventReportPagePropsSchema = z.object({
  report: eventReportSchema,
  viewerRole: staffRoleSchema,
  onChangeStatus: zFn<(change: EventStatusChange) => Promise<void> | void>().optional(),
  onRequestChange: zFn<(request: { type: "cancel" | "postpone"; reason: string }) => Promise<void> | void>().optional(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  backHref: z.string().min(1),
  entryHref: z.string().min(1).optional(),
  className: zClassName,
});
export type EventReportPageProps = z.input<typeof eventReportPagePropsSchema>;

const ACTIONS: Record<ReportAction, { title: string; description: string; confirm: string; tone: "danger" | "confirm" }> = {
  postpone: {
    title: msg("Postpone this event?"),
    description: msg(
      "Sales stop and every ticket holder is told. They can keep their tickets for the new date or get a full refund, fees included.",
    ),
    confirm: msg("Postpone event"),
    tone: "danger",
  },
  cancel: {
    title: msg("Cancel this event?"),
    description: msg("This can't be undone. Every ticket is refunded in full, fees included, and every holder is told."),
    confirm: msg("Cancel event"),
    tone: "danger",
  },
  reopen: {
    title: msg("Put this event back on sale?"),
    description: msg("Use this once the new date is confirmed. Ticket holders keep their tickets."),
    confirm: msg("Put back on sale"),
    tone: "confirm",
  },
  request_cancel: {
    title: msg("Ask to cancel this event?"),
    description: msg("A Matchpass admin reviews the request. Nothing changes for fans until it's approved."),
    confirm: msg("Send request"),
    tone: "danger",
  },
  request_postpone: {
    title: msg("Ask to postpone this event?"),
    description: msg("A Matchpass admin reviews the request. Nothing changes for fans until it's approved."),
    confirm: msg("Send request"),
    tone: "confirm",
  },
};

/** Page · EventReport — one event's sales, zones, money and entry, plus the actions the role may take. */
export function EventReportPage(props: EventReportPageProps) {
  validateProps("EventReportPage", eventReportPagePropsSchema, props);
  const { report, viewerRole: role, onChangeStatus, onRequestChange, submitting, serverError, backHref, entryHref, className } = props;
  const { t, f } = useI18n();
  const { LinkComponent } = useUI();
  const [action, setAction] = useState<ReportAction>();
  const isAdmin = role === "admin" && onChangeStatus;
  const isOrganizer = role === "organizer" && onRequestChange;
  const live = report.status !== "cancelled";
  const kpis: Kpi[] = [
    {
      id: "tickets",
      label: t("Tickets sold"),
      value: report.sold,
      format: "number",
      hint: t("of {capacity}", { capacity: f.number(report.capacity) }),
    },
    { id: "revenue", label: t("Ticket revenue"), value: report.revenue, format: "money", hint: t("Before fees and refunds") },
    { id: "orders", label: t("Net to organiser"), value: report.net, format: "money", hint: t("After 5% commission and refunds") },
    {
      id: "checkins",
      label: t("Checked in"),
      value: report.checkedIn,
      format: "number",
      hint: report.sold
        ? t("{share}% of tickets sold", { share: f.number(Math.round((report.checkedIn / report.sold) * 100)) })
        : undefined,
    },
  ];

  const confirm = async (reason: string | undefined) => {
    if (!action || (!reason && action !== "reopen")) return;
    if (action === "request_cancel" || action === "request_postpone") {
      await onRequestChange?.({ type: action === "request_cancel" ? "cancel" : "postpone", reason: reason! });
    } else {
      const status = action === "cancel" ? "cancelled" : action === "postpone" ? "postponed" : "on_sale";
      await onChangeStatus?.({ status, reason: reason ?? "New date confirmed" });
    }
    setAction(undefined);
  };

  const spec = action ? ACTIONS[action] : undefined;
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <LinkComponent href={backHref} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-pitch">
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {t("All events")}
      </LinkComponent>
      <DashboardPageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={saleStatusTone[report.status]}>{report.statusLabel}</Badge>
            {f.dateTimeLabel(report.startsAt)} · {report.venue} · {report.organizerName}
          </span>
        }
        title={report.title}
        actions={
          <>
            {entryHref ? (
              <LinkButton href={entryHref} variant="outline" size="lg">
                <ScanLine className="size-4" aria-hidden="true" />
                {t("Entry")}
              </LinkButton>
            ) : null}
            {isAdmin && live && report.status !== "postponed" ? (
              <Button variant="outline-warning" size="lg" onClick={() => setAction("postpone")}>
                {t("Postpone")}
              </Button>
            ) : null}
            {isAdmin && report.status === "postponed" ? (
              <Button variant="pitch" size="lg" onClick={() => setAction("reopen")}>
                {t("Put back on sale")}
              </Button>
            ) : null}
            {isAdmin && live ? (
              <Button variant="outline-danger" size="lg" onClick={() => setAction("cancel")}>
                {t("Cancel event")}
              </Button>
            ) : null}
            {isOrganizer && live && !report.pendingRequest ? (
              <>
                <Button variant="outline-warning" size="lg" onClick={() => setAction("request_postpone")}>
                  {t("Ask to postpone")}
                </Button>
                <Button variant="outline-danger" size="lg" onClick={() => setAction("request_cancel")}>
                  {t("Ask to cancel")}
                </Button>
              </>
            ) : null}
          </>
        }
      />
      {report.pendingRequest ? (
        <Notice tone="warning">
          {report.pendingRequest.type === "cancel"
            ? t("{name} asked to cancel this event. An admin will decide.", { name: report.pendingRequest.requestedBy })
            : t("{name} asked to postpone this event. An admin will decide.", { name: report.pendingRequest.requestedBy })}{" "}
          <span dir="auto">“{report.pendingRequest.reason}”</span>
        </Notice>
      ) : null}
      <KpiGrid kpis={kpis} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("Daily sales, last 14 days")}>
          <SalesChart points={report.sales} metric="tickets" label={t("Daily ticket sales, last 14 days")} />
        </Panel>
        <Panel title={t("Money")}>
          <DetailList
            items={[
              { label: t("Ticket revenue"), value: f.money(report.revenue) },
              { label: t("Service fees (fans)"), value: f.money(report.fees) },
              { label: t("Refunded"), value: f.money(report.refunds.refunded) },
              { label: t("Refund requests"), value: f.number(report.refunds.requested) },
              {
                label: t("Resale"),
                value: t("{listed} listed · {sold} sold", { listed: f.number(report.resale.listed), sold: f.number(report.resale.sold) }),
              },
              { label: t("Net to organiser"), value: <strong>{f.money(report.net)}</strong> },
            ]}
          />
        </Panel>
      </div>
      <Panel title={t("Sales by zone")}>
        <CapacityBars
          label={t("Sales by zone")}
          rows={report.zones.map((z) => ({ id: z.name, label: z.name, value: z.sold, max: z.capacity, detail: f.money(z.revenue) }))}
        />
      </Panel>
      {spec ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setAction(undefined)}
          title={t(spec.title)}
          description={t(spec.description)}
          confirmLabel={t(spec.confirm)}
          tone={spec.tone}
          reason={action === "reopen" ? "none" : "required"}
          reasonLabel={action?.startsWith("request") ? t("Why?") : t("Message to ticket holders")}
          onConfirm={confirm}
          submitting={submitting}
          serverError={serverError}
        />
      ) : null}
    </div>
  );
}

/* ---------- EntryPage ---------- */

export const entryPagePropsSchema = z.object({
  events: z.array(z.object({ eventId: z.string().min(1), title: z.string().min(1), startsAt: z.string() })).min(1),
  eventId: z.string().min(1),
  onEventChange: zFn<(eventId: string) => void>(),
  summary: entrySummarySchema,
  gates: z.array(z.string().min(1)).min(1),
  canScan: z.boolean(),
  onScan: zFn<(values: { gate: string; token: string }) => Promise<void> | void>(),
  onSampleToken: zFn<() => Promise<string>>().optional(),
  lastScan: entryScanSchema.optional(),
  scanning: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});
export type EntryPageProps = z.input<typeof entryPagePropsSchema>;

/** Page · Entry — match-day check-in: the gate scanner, how many are in, per gate, and the latest scans. */
export function EntryPage(props: EntryPageProps) {
  validateProps("EntryPage", entryPagePropsSchema, props);
  const { events, eventId, onEventChange, summary, gates, canScan, onScan, onSampleToken, lastScan, scanning, serverError, className } =
    props;
  const { t, f } = useI18n();
  const share = summary.sold ? Math.round((summary.checkedIn / summary.sold) * 100) : 0;
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <DashboardPageHeader
        title={t("Entry")}
        description={t("Scan tickets at the gate and watch the crowd come in.")}
        actions={
          <label className="flex items-center gap-2 text-sm font-semibold">
            <span>{t("Event")}</span>
            <NativeSelect
              className="h-11 w-auto max-w-[min(80vw,360px)]"
              value={eventId}
              onChange={(e) => onEventChange(e.target.value)}
              options={events.map((e) => ({ value: e.eventId, label: `${e.title} · ${f.dayLabel(e.startsAt)}` }))}
            />
          </label>
        }
      />
      <KpiGrid
        kpis={[
          {
            id: "checkins",
            label: t("Checked in"),
            value: summary.checkedIn,
            format: "number",
            hint: t("{share}% of tickets sold", { share: f.number(share) }),
          },
          { id: "tickets", label: t("Tickets sold"), value: summary.sold, format: "number" },
          { id: "orders", label: t("Still to arrive"), value: Math.max(0, summary.sold - summary.checkedIn), format: "number" },
        ]}
      />
      {canScan ? (
        <ScanPanel
          gates={gates}
          onScan={onScan}
          onSampleToken={onSampleToken}
          lastScan={lastScan}
          scanning={scanning}
          serverError={serverError}
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title={t("Entries by gate")}>
          {summary.gates.length ? (
            <CapacityBars
              label={t("Entries by gate")}
              unit="checked_in"
              rows={summary.gates.map((g) => ({ id: g.gate, label: g.gate, value: g.checkedIn, max: Math.max(1, summary.checkedIn) }))}
            />
          ) : (
            <p className="text-[14px] text-muted-ink">{t("No one has come in yet.")}</p>
          )}
        </Panel>
        <Panel title={t("Latest scans")}>
          <DataTable
            caption={t("Latest scans")}
            className="-mx-4 rounded-none border-x-0 sm:-mx-5"
            rows={summary.recent}
            rowKey={(s) => s.id}
            empty={t("No scans yet.")}
            columns={[
              { id: "time", header: t("Time"), cell: (s) => <span className="tabular-nums">{f.timeLabel(s.at)}</span> },
              { id: "ticket", header: t("Ticket"), cell: (s) => <bdi className="font-mono text-[13px]">{s.ticketCode}</bdi> },
              { id: "holder", header: t("Holder"), hideBelow: "sm", cell: (s) => <bdi>{s.holderName}</bdi> },
              { id: "gate", header: t("Gate"), hideBelow: "md", cell: (s) => s.gate },
              { id: "result", header: t("Result"), cell: (s) => <ScanResultBadge scan={s} /> },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
