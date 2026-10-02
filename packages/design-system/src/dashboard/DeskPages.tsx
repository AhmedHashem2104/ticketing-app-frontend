import {
  auditEntrySchema,
  eventRequestSchema,
  fanAccountRowSchema,
  fanIdReviewSchema,
  organizerRowSchema,
  payoutSchema,
  refundReviewSchema,
  staffOrderRowSchema,
  staffRoleSchema,
  type FanAccountRow,
  type FanIdReview,
  type RefundReview,
} from "@repo/contracts";
import { msg } from "@repo/i18n";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Avatar } from "../atoms/Identity";
import { Thumbnail } from "../atoms/Media";
import { EmptyState } from "../molecules/Content";
import { SearchField } from "../molecules/Form";
import { ChipGroup } from "../molecules/Navigation";
import { useI18n } from "../lib/provider";
import { validateProps, zClassName, zFn } from "../lib/props";
import { cn } from "../lib/utils";
import { DataTable, FilterBar, KpiGrid, orderStatusTone, payoutStatusTone } from "./Data";
import { ActionDialog, FanIdReviewCard, RefundReviewCard, RequestCard } from "./Reviews";
import { DashboardPageHeader, RoleBadge } from "./Shell";

const paymentMethodLabels = { card: msg("Card"), wallet: msg("Mobile wallet"), instapay: "InstaPay", fawry: "Fawry" } as const;

/** "All clear" message for an empty review queue. */
function QueueDone({ title, children }: { title: string; children?: string }) {
  return (
    <EmptyState title={title}>
      <span className="inline-flex items-center gap-2">
        <CheckCircle2 className="size-4 text-pitch" aria-hidden="true" />
        {children}
      </span>
    </EmptyState>
  );
}

/* ---------- OrdersPage ---------- */

const orderFilterSchema = z.enum(["all", "paid", "pending_payment", "payment_failed", "expired"]);
type OrderFilter = z.infer<typeof orderFilterSchema>;

export const ordersPagePropsSchema = z.object({
  orders: z.array(staffOrderRowSchema),
  query: z.string(),
  onQueryChange: zFn<(query: string) => void>(),
  status: orderFilterSchema,
  onStatusChange: zFn<(status: OrderFilter) => void>(),
  refreshing: z.boolean().optional(),
  className: zClassName,
});
export type OrdersPageProps = z.input<typeof ordersPagePropsSchema>;

const ORDER_FILTERS = [
  { value: "all", label: msg("All") },
  { value: "paid", label: msg("Paid") },
  { value: "pending_payment", label: msg("Waiting for payment") },
  { value: "payment_failed", label: msg("Payment failed") },
  { value: "expired", label: msg("Expired") },
] as const;

/** Page · Orders — find an order by reference, name, phone or event (support desk). */
export function OrdersPage(props: OrdersPageProps) {
  validateProps("OrdersPage", ordersPagePropsSchema, props);
  const { orders, query, onQueryChange, status, onStatusChange, refreshing, className } = props;
  const { t, f } = useI18n();
  const rows = status === "all" ? orders : orders.filter((o) => o.status === status);
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader title={t("Orders")} description={t("Look up any order to help a fan.")} />
      <FilterBar>
        <SearchField
          label={t("Search orders")}
          placeholder={t("Reference, name, phone or event")}
          value={query}
          onValueChange={onQueryChange}
          className="w-full sm:w-96"
        />
        <ChipGroup
          label={t("Filter by status")}
          size="sm"
          value={status}
          onValueChange={(v) => onStatusChange(v as OrderFilter)}
          options={ORDER_FILTERS.map((o) => ({ value: o.value, label: t(o.label) }))}
        />
      </FilterBar>
      <DataTable
        caption={t("Orders")}
        rows={rows}
        rowKey={(o) => o.id}
        refreshing={refreshing}
        empty={t("No orders match.")}
        columns={[
          { id: "ref", header: t("Order"), cell: (o) => <bdi className="font-mono text-[13px] font-semibold">{o.reference}</bdi> },
          {
            id: "customer",
            header: t("Customer"),
            cell: (o) => (
              <span className="flex flex-col">
                <span className="font-medium">{o.customer}</span>
                <bdi dir="ltr" className="text-[12px] text-muted-ink">
                  {o.phoneMasked}
                </bdi>
              </span>
            ),
          },
          { id: "event", header: t("Event"), hideBelow: "md", cell: (o) => o.eventTitle },
          { id: "tickets", header: t("Tickets"), align: "end", hideBelow: "sm", cell: (o) => f.number(o.tickets) },
          { id: "total", header: t("Total"), align: "end", cell: (o) => f.money(o.total) },
          { id: "method", header: t("Payment"), hideBelow: "lg", cell: (o) => t(paymentMethodLabels[o.method]) },
          { id: "status", header: t("Status"), cell: (o) => <Badge tone={orderStatusTone[o.status] ?? "neutral"}>{o.statusLabel}</Badge> },
          {
            id: "date",
            header: t("Placed"),
            hideBelow: "lg",
            cell: (o) => <span className="whitespace-nowrap">{f.dateTimeLabel(o.createdAt)}</span>,
          },
        ]}
      />
    </div>
  );
}

/* ---------- FansPage ---------- */

export const fansPagePropsSchema = z.object({
  fans: z.array(fanAccountRowSchema),
  query: z.string(),
  onQueryChange: zFn<(query: string) => void>(),
  canManage: z.boolean(),
  onSuspend: zFn<(fanId: string, reason: string) => Promise<void> | void>(),
  onReactivate: zFn<(fanId: string) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  refreshing: z.boolean().optional(),
  className: zClassName,
});
export type FansPageProps = z.input<typeof fansPagePropsSchema>;

const fanIdStatusLabels = { none: msg("No Fan ID"), pending: msg("In review"), approved: msg("Approved") } as const;
const fanIdStatusTones = { none: "neutral", pending: "warning", approved: "success" } as const;

/** Page · Fans — fan accounts with their Fan ID, orders and spend; admins can suspend touts. */
export function FansPage(props: FansPageProps) {
  validateProps("FansPage", fansPagePropsSchema, props);
  const { fans, query, onQueryChange, canManage, onSuspend, onReactivate, submitting, serverError, refreshing, className } = props;
  const { t, f } = useI18n();
  const [dialog, setDialog] = useState<{ fan: FanAccountRow; mode: "suspend" | "reactivate" }>();
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader title={t("Fans")} description={t("Fan accounts, their Fan ID and what they've bought.")} />
      <FilterBar>
        <SearchField
          label={t("Search fans")}
          placeholder={t("Name, phone or email")}
          value={query}
          onValueChange={onQueryChange}
          className="w-full sm:w-96"
        />
      </FilterBar>
      <DataTable
        caption={t("Fans")}
        rows={fans}
        rowKey={(u) => u.id}
        refreshing={refreshing}
        empty={t("No fans match.")}
        columns={[
          {
            id: "fan",
            header: t("Fan"),
            cell: (u) => (
              <span className="flex min-w-[200px] items-center gap-3">
                <Avatar initials={u.initials} src={u.avatarUrl} size="sm" />
                <span className="flex flex-col">
                  <span className="font-semibold">{u.fullName}</span>
                  <bdi dir="ltr" className="text-start text-[12px] text-muted-ink">
                    {u.phoneMasked}
                  </bdi>
                </span>
              </span>
            ),
          },
          {
            id: "fanid",
            header: t("Fan ID"),
            cell: (u) => <Badge tone={fanIdStatusTones[u.fanIdStatus]}>{t(fanIdStatusLabels[u.fanIdStatus])}</Badge>,
          },
          { id: "orders", header: t("Orders"), align: "end", hideBelow: "md", cell: (u) => f.number(u.orders) },
          { id: "tickets", header: t("Tickets"), align: "end", hideBelow: "md", cell: (u) => f.number(u.tickets) },
          { id: "spent", header: t("Spent"), align: "end", hideBelow: "sm", cell: (u) => f.money(u.spent) },
          {
            id: "state",
            header: t("Account"),
            cell: (u) => (u.suspended ? <Badge tone="danger">{t("Suspended")}</Badge> : <Badge tone="success">{t("Active")}</Badge>),
          },
          ...(canManage
            ? [
                {
                  id: "actions",
                  header: t("Actions"),
                  align: "end" as const,
                  cell: (u: FanAccountRow) =>
                    u.suspended ? (
                      <Button variant="outline" size="sm" onClick={() => setDialog({ fan: u, mode: "reactivate" })}>
                        {t("Reactivate")}
                      </Button>
                    ) : (
                      <Button variant="outline-danger" size="sm" onClick={() => setDialog({ fan: u, mode: "suspend" })}>
                        {t("Suspend")}
                      </Button>
                    ),
                },
              ]
            : []),
        ]}
      />
      {dialog ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setDialog(undefined)}
          title={
            dialog.mode === "suspend"
              ? t("Suspend {name}?", { name: dialog.fan.fullName })
              : t("Reactivate {name}?", { name: dialog.fan.fullName })
          }
          description={
            dialog.mode === "suspend"
              ? t("They're signed out everywhere and can't sign in or buy until you reactivate the account. Their tickets stay valid.")
              : t("They can sign in and buy tickets again.")
          }
          confirmLabel={dialog.mode === "suspend" ? t("Suspend account") : t("Reactivate account")}
          tone={dialog.mode === "suspend" ? "danger" : "confirm"}
          reason={dialog.mode === "suspend" ? "required" : "none"}
          reasonLabel={t("Reason (kept in the audit log)")}
          submitting={submitting}
          serverError={serverError}
          onConfirm={async (reason) => {
            if (dialog.mode === "suspend") await onSuspend(dialog.fan.id, reason!);
            else await onReactivate(dialog.fan.id);
            setDialog(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- FanIdQueuePage ---------- */

export const fanIdQueuePagePropsSchema = z.object({
  reviews: z.array(fanIdReviewSchema),
  onApprove: zFn<(userId: string) => Promise<void> | void>(),
  onReject: zFn<(userId: string, reason: string) => Promise<void> | void>(),
  busyId: z.string().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});
export type FanIdQueuePageProps = z.input<typeof fanIdQueuePagePropsSchema>;

/** Page · Fan ID reviews — applications the automatic check couldn't approve, oldest first. */
export function FanIdQueuePage(props: FanIdQueuePageProps) {
  validateProps("FanIdQueuePage", fanIdQueuePagePropsSchema, props);
  const { reviews, onApprove, onReject, busyId, serverError, className } = props;
  const { t } = useI18n();
  const [rejecting, setRejecting] = useState<FanIdReview>();
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader
        title={t("Fan ID reviews")}
        description={t(
          "Applications the automatic check flagged. Compare the photos, then approve or reject — the fan is told either way.",
        )}
        actions={
          <Badge tone={reviews.length ? "warning" : "success"} size="md">
            {t("{count, plural, =0 {Queue empty} one {# waiting} other {# waiting}}", { count: reviews.length })}
          </Badge>
        }
      />
      {reviews.length === 0 ? (
        <QueueDone title={t("No Fan IDs to review")}>{t("New flagged applications appear here.")}</QueueDone>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((review) => (
            <FanIdReviewCard
              key={review.userId}
              review={review}
              busy={busyId === review.userId}
              onApprove={() => void onApprove(review.userId)}
              onReject={() => setRejecting(review)}
            />
          ))}
        </div>
      )}
      {rejecting ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setRejecting(undefined)}
          title={t("Reject {name}'s Fan ID?", { name: rejecting.fullName })}
          description={t("They can apply again. Tell them what to fix.")}
          confirmLabel={t("Reject Fan ID")}
          tone="danger"
          reason="required"
          reasonLabel={t("Message to the fan")}
          submitting={busyId === rejecting.userId}
          serverError={serverError}
          onConfirm={async (reason) => {
            await onReject(rejecting.userId, reason!);
            setRejecting(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- RefundsPage ---------- */

const refundFilterSchema = z.enum(["in_review", "refunded", "rejected", "all"]);
type RefundFilter = z.infer<typeof refundFilterSchema>;

export const refundsPagePropsSchema = z.object({
  refunds: z.array(refundReviewSchema),
  status: refundFilterSchema,
  onStatusChange: zFn<(status: RefundFilter) => void>(),
  onApprove: zFn<(refundId: string) => Promise<void> | void>(),
  onReject: zFn<(refundId: string, reason: string) => Promise<void> | void>(),
  busyId: z.string().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});
export type RefundsPageProps = z.input<typeof refundsPagePropsSchema>;

const REFUND_FILTERS = [
  { value: "in_review", label: msg("To decide") },
  { value: "refunded", label: msg("Refunded") },
  { value: "rejected", label: msg("Not approved") },
  { value: "all", label: msg("All") },
] as const;

/** Page · Refunds — requests to decide; approving cancels the tickets and sends the money. */
export function RefundsPage(props: RefundsPageProps) {
  validateProps("RefundsPage", refundsPagePropsSchema, props);
  const { refunds, status, onStatusChange, onApprove, onReject, busyId, serverError, className } = props;
  const { t, f } = useI18n();
  const [rejecting, setRejecting] = useState<RefundReview>();
  const waiting = refunds.filter((r) => r.status === "in_review");
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader
        title={t("Refunds")}
        description={t("Approving cancels the tickets and sends the money to the fan's chosen method. Rejecting keeps the tickets valid.")}
      />
      {status === "in_review" ? (
        <KpiGrid
          kpis={[
            { id: "refund_queue", label: t("Requests to decide"), value: waiting.length, format: "number" },
            { id: "revenue", label: t("Amount requested"), value: waiting.reduce((sum, r) => sum + r.amount, 0), format: "money" },
          ]}
        />
      ) : null}
      <FilterBar>
        <ChipGroup
          label={t("Filter by status")}
          size="sm"
          value={status}
          onValueChange={(v) => onStatusChange(v as RefundFilter)}
          options={REFUND_FILTERS.map((o) => ({ value: o.value, label: t(o.label) }))}
        />
      </FilterBar>
      {refunds.length === 0 ? (
        status === "in_review" ? (
          <QueueDone title={t("No refunds to decide")}>{t("New requests appear here.")}</QueueDone>
        ) : (
          <EmptyState title={t("No refunds here")} />
        )
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {refunds.map((refund) => (
            <RefundReviewCard
              key={refund.id}
              refund={refund}
              busy={busyId === refund.id}
              onApprove={() => void onApprove(refund.id)}
              onReject={() => setRejecting(refund)}
            />
          ))}
        </div>
      )}
      {rejecting ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setRejecting(undefined)}
          title={t("Reject refund {reference}?", { reference: rejecting.reference })}
          description={t("{name}'s tickets stay valid and {amount} isn't refunded.", {
            name: rejecting.customer,
            amount: f.money(rejecting.amount),
          })}
          confirmLabel={t("Reject refund")}
          tone="danger"
          reason="required"
          reasonLabel={t("Message to the fan")}
          submitting={busyId === rejecting.id}
          serverError={serverError}
          onConfirm={async (reason) => {
            await onReject(rejecting.id, reason!);
            setRejecting(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- RequestsPage ---------- */

export const requestsPagePropsSchema = z.object({
  requests: z.array(eventRequestSchema),
  canDecide: z.boolean(),
  onApprove: zFn<(requestId: string) => Promise<void> | void>(),
  onReject: zFn<(requestId: string, reason: string) => Promise<void> | void>(),
  busyId: z.string().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});
export type RequestsPageProps = z.input<typeof requestsPagePropsSchema>;

/** Page · Change requests — organisers' requests to cancel or postpone; admins decide. */
export function RequestsPage(props: RequestsPageProps) {
  validateProps("RequestsPage", requestsPagePropsSchema, props);
  const { requests, canDecide, onApprove, onReject, busyId, serverError, className } = props;
  const { t } = useI18n();
  const [rejecting, setRejecting] = useState<string>();
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");
  const card = (r: (typeof requests)[number]) => (
    <RequestCard
      key={r.id}
      headingLevel="h3"
      request={r}
      busy={busyId === r.id}
      onApprove={canDecide ? () => void onApprove(r.id) : undefined}
      onReject={canDecide ? () => setRejecting(r.id) : undefined}
    />
  );
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader
        title={t("Change requests")}
        description={
          canDecide
            ? t("Organisers can't cancel or postpone on their own. Approving applies the change and tells every ticket holder.")
            : t("Ask to cancel or postpone from an event's page. A Matchpass admin decides.")
        }
      />
      <section aria-label={t("Waiting")} className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">{t("Waiting")}</h2>
        {pending.length ? (
          <div className="grid gap-4 xl:grid-cols-2">{pending.map(card)}</div>
        ) : (
          <QueueDone title={t("No requests waiting")} />
        )}
      </section>
      {decided.length ? (
        <section aria-label={t("Decided")} className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">{t("Decided")}</h2>
          <div className="grid gap-4 xl:grid-cols-2">{decided.map(card)}</div>
        </section>
      ) : null}
      {rejecting ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setRejecting(undefined)}
          title={t("Reject this request?")}
          description={t("The event stays as it is. The organiser sees your reason.")}
          confirmLabel={t("Reject request")}
          tone="danger"
          reason="required"
          reasonLabel={t("Message to the organiser")}
          submitting={busyId === rejecting}
          serverError={serverError}
          onConfirm={async (reason) => {
            await onReject(rejecting, reason!);
            setRejecting(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- OrganizersPage ---------- */

export const organizersPagePropsSchema = z.object({ organizers: z.array(organizerRowSchema), className: zClassName });
export type OrganizersPageProps = z.input<typeof organizersPagePropsSchema>;

/** Page · Organisers — clubs and promoters selling on Matchpass, with sales and money owed. */
export function OrganizersPage(props: OrganizersPageProps) {
  validateProps("OrganizersPage", organizersPagePropsSchema, props);
  const { organizers, className } = props;
  const { t, f } = useI18n();
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader title={t("Organisers")} description={t("Clubs and promoters selling on Matchpass.")} />
      <DataTable
        caption={t("Organisers")}
        rows={organizers}
        rowKey={(o) => o.id}
        columns={[
          {
            id: "name",
            header: t("Organiser"),
            cell: (o) => (
              <span className="flex items-center gap-3">
                <Thumbnail src={o.logoUrl} size="sm" className="bg-paper [&_img]:object-contain [&_img]:p-1.5" />
                <span className="font-semibold">{o.name}</span>
              </span>
            ),
          },
          { id: "events", header: t("Events"), align: "end", cell: (o) => f.number(o.events) },
          { id: "tickets", header: t("Tickets sold"), align: "end", hideBelow: "sm", cell: (o) => f.number(o.ticketsSold) },
          { id: "revenue", header: t("Revenue"), align: "end", hideBelow: "md", cell: (o) => f.money(o.revenue) },
          { id: "due", header: t("Next payout"), align: "end", cell: (o) => f.money(o.payoutDue) },
        ]}
      />
    </div>
  );
}

/* ---------- PayoutsPage ---------- */

export const payoutsPagePropsSchema = z.object({ payouts: z.array(payoutSchema), viewerRole: staffRoleSchema, className: zClassName });
export type PayoutsPageProps = z.input<typeof payoutsPagePropsSchema>;

/** Page · Payouts — weekly settlements: gross sales, commission, refunds and the net paid out. */
export function PayoutsPage(props: PayoutsPageProps) {
  validateProps("PayoutsPage", payoutsPagePropsSchema, props);
  const { payouts, viewerRole: role, className } = props;
  const { t, f } = useI18n();
  const scheduled = payouts.filter((p) => p.status === "scheduled");
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader
        title={t("Payouts")}
        description={t("Paid weekly, every Tuesday, after the 5% Matchpass commission and any refunds.")}
      />
      <KpiGrid
        kpis={[
          { id: "revenue", label: t("Next payout"), value: scheduled.reduce((s, p) => s + p.net, 0), format: "money" },
          {
            id: "orders",
            label: t("Paid out so far"),
            value: payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0),
            format: "money",
          },
        ]}
      />
      <DataTable
        caption={t("Payouts")}
        rows={payouts}
        rowKey={(p) => p.id}
        empty={t("No payouts yet.")}
        columns={[
          { id: "period", header: t("Sales week"), cell: (p) => <span className="whitespace-nowrap font-medium">{p.period}</span> },
          ...(role === "admin" ? [{ id: "org", header: t("Organiser"), cell: (p: (typeof payouts)[number]) => p.organizerName }] : []),
          { id: "gross", header: t("Gross"), align: "end", hideBelow: "md", cell: (p) => f.money(p.gross) },
          { id: "fees", header: t("Commission"), align: "end", hideBelow: "lg", cell: (p) => `−${f.money(p.fees)}` },
          { id: "refunds", header: t("Refunds"), align: "end", hideBelow: "lg", cell: (p) => (p.refunds ? `−${f.money(p.refunds)}` : "—") },
          { id: "net", header: t("Net"), align: "end", cell: (p) => <strong>{f.money(p.net)}</strong> },
          { id: "status", header: t("Status"), cell: (p) => <Badge tone={payoutStatusTone[p.status]}>{p.statusLabel}</Badge> },
          {
            id: "date",
            header: t("Pay date"),
            hideBelow: "sm",
            cell: (p) => <span className="whitespace-nowrap">{f.shortDateLabel(`${p.payDate}T12:00:00Z`)}</span>,
          },
        ]}
      />
    </div>
  );
}

/* ---------- AuditPage ---------- */

export const auditPagePropsSchema = z.object({
  entries: z.array(auditEntrySchema),
  query: z.string(),
  onQueryChange: zFn<(query: string) => void>(),
  className: zClassName,
});
export type AuditPageProps = z.input<typeof auditPagePropsSchema>;

/** Page · Audit log — who changed what, newest first. Every staff decision is recorded. */
export function AuditPage(props: AuditPageProps) {
  validateProps("AuditPage", auditPagePropsSchema, props);
  const { entries, query, onQueryChange, className } = props;
  const { t, f } = useI18n();
  const q = query.trim().toLowerCase();
  const rows = q ? entries.filter((e) => [e.actor, e.action, e.target, e.detail ?? ""].some((v) => v.toLowerCase().includes(q))) : entries;
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <DashboardPageHeader title={t("Audit log")} description={t("Every decision staff make, newest first.")} />
      <FilterBar>
        <SearchField
          label={t("Search the log")}
          placeholder={t("Person, action or target")}
          value={query}
          onValueChange={onQueryChange}
          className="w-full sm:w-96"
        />
      </FilterBar>
      <DataTable
        caption={t("Audit log")}
        rows={rows}
        rowKey={(e) => e.id}
        empty={t("Nothing recorded yet.")}
        columns={[
          { id: "at", header: t("When"), cell: (e) => <span className="whitespace-nowrap tabular-nums">{f.dateTimeLabel(e.at)}</span> },
          {
            id: "who",
            header: t("Who"),
            cell: (e) => (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.actor}</span>
                <RoleBadge role={e.role} />
              </span>
            ),
          },
          { id: "action", header: t("Action"), cell: (e) => <span className="font-semibold">{e.action}</span> },
          { id: "target", header: t("On"), hideBelow: "sm", cell: (e) => e.target },
          {
            id: "detail",
            header: t("Details"),
            hideBelow: "lg",
            cell: (e) => (
              <span dir="auto" className="text-muted-ink">
                {e.detail ?? "—"}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
