import { zodResolver } from "@hookform/resolvers/zod";
import {
  qrTokenSchema,
  ticketSchema,
  transferRequestSchema,
  transferSchema,
  type QrToken,
  type Ticket,
  type TicketVariant,
  type TransferRequest,
} from "@repo/contracts";
import { ChevronLeft, ChevronRight, Loader2, Lock, RotateCcw } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { Badge } from "../atoms/Badge";
import { Button, LinkButton } from "../atoms/Button";
import { Barcode, QRCode } from "../atoms/Codes";
import { DateBadge } from "../atoms/DataDisplay";
import { ProgressBar } from "../atoms/Feedback";
import { Input } from "../atoms/FormControls";
import { Eyebrow } from "../atoms/Typography";
import { HolderRow, Notice } from "../molecules/Content";
import { Field } from "../molecules/Form";
import { dateTimeLabel } from "../lib/datetime";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zFn, zHref } from "../lib/props";
import { themeSurface } from "../lib/theme";
import { cn } from "../lib/utils";

/* ---------- StubTicket ---------- */

const variants: Record<TicketVariant, Record<string, string>> = {
  ink: {
    band: "",
    logo: "#121512",
    stub: "#1C1F1C",
    fg: "#FFFFFF",
    muted: "#CFCDC4",
    line: "#6B6F69",
    track: "#3A3F39",
    accent: "#F2B705",
    barBg: "#121512",
    bar: "#FFFFFF",
  },
  lime: {
    band: "#8DC63F",
    logo: "#4F7A12",
    stub: "#8DC63F",
    fg: "#121512",
    muted: "#2A3A10",
    line: "#4F7A12",
    track: "#FFFFFF",
    accent: "#121512",
    barBg: "#8DC63F",
    bar: "#121512",
  },
  purple: {
    band: "#3B1F6B",
    logo: "#3B1F6B",
    stub: "#3B1F6B",
    fg: "#FFFFFF",
    muted: "#DCD2EE",
    line: "#8A70BD",
    track: "#5A3A8C",
    accent: "#F2B705",
    barBg: "#3B1F6B",
    bar: "#FFFFFF",
  },
};

export const stubTicketPropsSchema = z.object({
  ticket: ticketSchema,
  cut: z.enum(["paper", "white"]).optional(),
  className: zClassName,
});

export type StubTicketProps = z.input<typeof stubTicketPropsSchema>;

/** Organism · StubTicket — the signature Matchpass paper-ticket graphic. */
export function StubTicket(props: StubTicketProps) {
  validateProps("StubTicket", stubTicketPropsSchema, props);
  const { ticket, cut = "paper", className } = props;
  const v = variants[ticket.variant];
  const cutColor = cut === "paper" ? "#F3F1EA" : "#FFFFFF";
  const stampLabel: Partial<Record<Ticket["status"], string>> = {
    refunded: "REFUNDED",
    cancelled: "CANCELLED",
    transferred: "TRANSFERRED",
    resold: "RESOLD",
  };
  const stamp = stampLabel[ticket.status];
  const stamped = !!stamp;
  const summary = `${ticket.title}, ${ticket.dateLabel} ${ticket.time}, ${ticket.venueName}. ${ticket.fields.map((f) => `${f.key} ${f.value}`).join(", ")}. Holder ${ticket.holderName}.${stamped ? ` ${ticket.status}.` : ""}`;
  return (
    <div className={cn("max-w-full overflow-x-auto py-3.5", className)}>
      <article aria-label={summary} className="relative h-[284px] w-[880px] font-sans text-ink">
        <div className="flex h-full w-full" style={{ filter: stamped ? "grayscale(1) opacity(0.55)" : undefined }}>
          <div
            className="relative grid h-full w-[640px] grid-cols-[minmax(0,1fr)_186px] gap-x-6 rounded-l-2xl bg-white py-5 pr-[30px] pl-[26px]"
            style={{ borderTop: v.band ? `10px solid ${v.band}` : undefined }}
          >
            <div className="flex min-w-0 flex-col justify-between">
              <span className="flex items-center gap-2" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 36 36" fill="none" stroke={v.logo} strokeWidth="3">
                  <path d="M4 10h28v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z" />
                  <path d="M14 10v16" strokeDasharray="3 3" />
                </svg>
                <span className="font-ticket text-[15px] font-extrabold tracking-[0.02em]">Matchpass</span>
              </span>
              <div className="flex flex-col gap-1.5" aria-hidden="true">
                <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-sub">{ticket.kindLabel}</span>
                <span className="font-ticket text-[32px] leading-none font-black tracking-[-0.01em] uppercase">{ticket.title}</span>
              </div>
              <div className="flex items-end justify-between gap-3" aria-hidden="true">
                <span className="font-mono text-xs font-semibold">{ticket.dateLabel}</span>
                <span className="text-right text-xs leading-snug">
                  {ticket.venueName}
                  <br />
                  {ticket.venueArea}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-between" aria-hidden="true">
              <span className="font-mono text-xs font-semibold">{ticket.priceLabel}</span>
              <div className="flex flex-col gap-[3px] text-[13px]">
                {ticket.fields.map((f) => (
                  <span key={f.key}>
                    {f.key}: <strong>{f.value}</strong>
                  </span>
                ))}
              </div>
              <Barcode value={ticket.code} color={v.bar} background={v.barBg} />
            </div>
          </div>
          <div
            className="flex h-full w-[240px] flex-col justify-between rounded-r-2xl pt-5 pr-5 pb-4 pl-7"
            style={{ background: v.stub, color: v.fg }}
            aria-hidden="true"
          >
            <div className="flex items-start justify-between">
              <div className="rounded bg-white p-[5px]">
                {ticket.qrReady ? (
                  <QRCode value={`https://matchpass.app/t/${ticket.code}`} size={84} label="Ticket QR code" />
                ) : (
                  <div className="flex size-[84px] items-center justify-center text-smoke">
                    <Lock className="size-6" />
                  </div>
                )}
              </div>
              <div className="flex h-[104px] gap-2 text-[11px] [writing-mode:vertical-rl]">
                <span className="border-l border-dashed pl-0.5" style={{ borderColor: v.line }}>
                  Name: {ticket.holderName}
                </span>
                <span className="border-l border-dashed pl-0.5" style={{ borderColor: v.line }}>
                  Date: {ticket.holderDate}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-ticket text-[34px] leading-none font-black">{ticket.time}</span>
              <span className="text-[11px]" style={{ color: v.muted }}>
                {ticket.timeLabel}
              </span>
              <div className="h-[5px] rounded-[3px]" style={{ background: v.track }}>
                <div className="h-[5px] rounded-[3px]" style={{ width: `${ticket.progress}%`, background: v.accent }} />
              </div>
            </div>
            <span className="border-t pt-2.5 font-mono text-[11px]" style={{ borderColor: v.line }}>
              matchpass.app/t/{ticket.code}
            </span>
          </div>
        </div>
        <span aria-hidden="true" className="absolute -top-3.5 left-[626px] size-7 rounded-full" style={{ background: cutColor }} />
        <span aria-hidden="true" className="absolute -bottom-3.5 left-[626px] size-7 rounded-full" style={{ background: cutColor }} />
        <span aria-hidden="true" className="absolute inset-y-[22px] left-[634px] flex w-3 flex-col items-center justify-between">
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} className="size-2.5 rounded-full" style={{ background: cutColor }} />
          ))}
        </span>
        {stamped ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-24 left-[150px] -rotate-[10deg] rounded-lg border-4 bg-white px-5 py-2 font-ticket text-[40px] font-black tracking-[0.04em]",
              ticket.status === "refunded" || ticket.status === "transferred" || ticket.status === "resold"
                ? "border-pitch text-pitch"
                : "border-rose-ink text-rose-ink",
            )}
          >
            {stamp}
          </span>
        ) : null}
      </article>
    </div>
  );
}

/* ---------- TicketActions (My tickets row) ---------- */

export const ticketActionsPropsSchema = z.object({
  ticket: ticketSchema,
  showQrHref: zHref,
  onAddToWallet: zFn<() => void>().optional(),
  transferHref: zHref.optional(),
  resaleHref: zHref.optional(),
  refundHref: zHref.optional(),
  onCancelTransfer: zFn<() => void>().optional(),
  className: zClassName,
});

export type TicketActionsProps = z.input<typeof ticketActionsPropsSchema>;

const statusNote: Partial<Record<Ticket["status"], string>> = {
  refund_pending: "Refund requested — tickets stay valid until it's approved",
  listed: "Listed on official resale",
  transfer_pending: "Transfer pending — waiting for them to accept",
};

/** Organism · TicketActions — note, actions and refund link beside a stub ticket. */
export function TicketActions(props: TicketActionsProps) {
  validateProps("TicketActions", ticketActionsPropsSchema, props);
  const { ticket, showQrHref, onAddToWallet, transferHref, resaleHref, refundHref, onCancelTransfer, className } = props;
  const note = `Ticket ${ticket.position.index} of ${ticket.position.of} · ${ticket.eventKind === "match" ? ticket.holderDetail.split(" · ")[0] : ticket.refundable ? ticket.refundNote.charAt(0).toLowerCase() + ticket.refundNote.slice(1) : ticket.holderDetail}`;
  return (
    <div className={cn("flex flex-[1_1_260px] flex-col gap-2", className)}>
      <span className="text-[13px] text-muted-ink">{note}</span>
      {statusNote[ticket.status] ? <span className="text-[13px] font-semibold text-warn">{statusNote[ticket.status]}</span> : null}
      <div className="flex flex-wrap gap-2">
        <LinkButton href={showQrHref} variant="ink" size="md" aria-label={`Show QR for ${ticket.title}, ticket ${ticket.position.index}`}>
          Show QR
        </LinkButton>
        {onAddToWallet ? (
          <Button variant="outline" onClick={onAddToWallet}>
            Add to wallet
          </Button>
        ) : null}
        {transferHref && ticket.status === "valid" ? (
          <LinkButton href={transferHref} variant="outline" size="md" className="font-normal">
            Transfer
          </LinkButton>
        ) : null}
        {resaleHref && ticket.resaleAllowed && ticket.status === "valid" ? (
          <LinkButton href={resaleHref} variant="outline" size="md" className="font-normal">
            Resell
          </LinkButton>
        ) : null}
        {onCancelTransfer && ticket.status === "transfer_pending" ? (
          <Button variant="outline" onClick={onCancelTransfer} className="font-normal">
            Cancel transfer
          </Button>
        ) : null}
      </div>
      {refundHref ? (
        ticket.refundable && ticket.status === "valid" ? (
          <AppLink href={refundHref} tone="pitch" className="flex min-h-11 items-center gap-1.5 self-start text-sm">
            <RotateCcw className="size-[18px]" aria-hidden="true" />
            Request a refund
          </AppLink>
        ) : (
          <span className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-ink">
            <RotateCcw className="size-[18px]" aria-hidden="true" />
            {ticket.refundNote}
          </span>
        )
      ) : null}
    </div>
  );
}

/* ---------- TicketListItem ---------- */

export const ticketListItemPropsSchema = z.object({
  ticket: ticketSchema,
  countLabel: z.string().min(1),
  selected: z.boolean(),
  onSelect: zFn<() => void>(),
  className: zClassName,
});

export type TicketListItemProps = z.input<typeof ticketListItemPropsSchema>;

/** Organism · TicketListItem — event entry in the wallet sidebar. */
export function TicketListItem(props: TicketListItemProps) {
  validateProps("TicketListItem", ticketListItemPropsSchema, props);
  const { ticket, countLabel, selected, onSelect, className } = props;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl bg-white p-3.5 text-left",
        selected ? "border-2 border-ink" : "border border-line hover:border-ink",
        className,
      )}
    >
      <DateBadge date={ticket.startsAt} theme={ticket.theme} size="sm" />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold">{ticket.title}</span>
        <span className="text-[13px] text-muted-ink">
          {countLabel} · {ticket.venueName}
        </span>
      </span>
    </button>
  );
}

/* ---------- TransferForm ---------- */

export const transferFormPropsSchema = z.object({
  mode: z.enum(["fan_id", "contact"]),
  note: z.string().min(1),
  onSubmit: zFn<(values: TransferRequest) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});

export type TransferFormProps = z.input<typeof transferFormPropsSchema>;

/** Organism · TransferForm — send a ticket to a Fan ID (matches) or phone/email (shows). */
export function TransferForm(props: TransferFormProps) {
  validateProps("TransferForm", transferFormPropsSchema, props);
  const { mode, note, onSubmit, submitting, serverError, className } = props;
  const form = useForm<TransferRequest, unknown, z.output<typeof transferRequestSchema>>({
    resolver: zodResolver(transferRequestSchema),
    defaultValues: { mode, recipient: "" },
  });
  const isFanId = mode === "fan_id";
  return (
    <form
      noValidate
      aria-label="Transfer ticket"
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className={cn("flex flex-col gap-2.5 rounded-xl border border-line p-4", className)}
    >
      <input type="hidden" {...form.register("mode")} />
      <Field
        label={isFanId ? "Recipient’s Fan ID" : "Friend’s phone or email"}
        hint={note}
        error={form.formState.errors.recipient?.message}
        labelSize="md"
      >
        <Input mono autoComplete="off" placeholder={isFanId ? "e.g. 2210 4417 1907" : "+20 10 0000 0000"} {...form.register("recipient")} />
      </Field>
      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
      <Button type="submit" variant="pitch" className="self-start" loading={submitting} loadingText="Sending…">
        Send ticket
      </Button>
    </form>
  );
}

/* ---------- TicketDetailPanel ---------- */

export const ticketDetailPanelPropsSchema = z.object({
  ticket: ticketSchema,
  position: z.object({ index: z.number().int().positive(), of: z.number().int().positive() }),
  onPrevious: zFn<() => void>(),
  onNext: zFn<() => void>(),
  onAddToWallet: zFn<() => void>().optional(),
  resaleHref: zHref.optional(),
  /** Current server-signed entry token; the panel asks for a new one when it expires. */
  qr: z.object({ token: qrTokenSchema.optional(), error: z.string().optional(), onExpire: zFn<() => void>() }).optional(),
  onCancelTransfer: zFn<() => void>().optional(),
  transfer: z
    .object({
      open: z.boolean(),
      onOpenChange: zFn<(open: boolean) => void>(),
      onSubmit: zFn<(values: TransferRequest) => Promise<void> | void>(),
      submitting: z.boolean().optional(),
      serverError: z.string().optional(),
      successMessage: z.string().optional(),
    })
    .optional(),
  className: zClassName,
});

export type TicketDetailPanelProps = z.input<typeof ticketDetailPanelPropsSchema>;

function RotatingQR({ qr, onExpire }: { qr: QrToken; onExpire: () => void }) {
  const left = useCountdown(qr.expiresAt, onExpire);
  const period = Math.max(qr.refreshInSeconds, left, 1);
  return (
    <div className="flex flex-col items-center gap-2.5">
      <QRCode value={qr.token} size={231} label="Entry QR code" />
      <ProgressBar value={(left / period) * 100} label="Time until the QR code refreshes" size="xs" className="w-[231px]" />
      <span className="text-xs text-muted-ink">Refreshes in 0:{String(left).padStart(2, "0")} · screenshots won&apos;t scan</span>
    </div>
  );
}

/** Organism · TicketDetailPanel — live QR, seat fields, entry info and transfer. */
export function TicketDetailPanel(props: TicketDetailPanelProps) {
  validateProps("TicketDetailPanel", ticketDetailPanelPropsSchema, props);
  const { ticket, position, onPrevious, onNext, onAddToWallet, resaleHref, qr, onCancelTransfer, transfer, className } = props;
  const transferId = useId();
  const canAct = ticket.status === "valid";
  return (
    <section aria-label={`Ticket for ${ticket.title}`} className={cn("overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <div className={cn("flex flex-wrap justify-between gap-4 px-[26px] py-[22px]", themeSurface[ticket.theme])}>
        <div className="flex flex-col gap-1">
          <Eyebrow tone="gold" size="sm">
            {ticket.kindLabel}
          </Eyebrow>
          <h2 className="font-display text-[36px] leading-none font-extrabold uppercase">{ticket.title}</h2>
          <span className="text-[15px] text-sand">{ticket.whenLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline-inverse" size="icon" aria-label="Previous ticket" onClick={onPrevious} disabled={position.index <= 1}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="px-1.5 text-sm" aria-live="polite">
            Ticket {position.index} of {position.of}
          </span>
          <Button variant="outline-inverse" size="icon" aria-label="Next ticket" onClick={onNext} disabled={position.index >= position.of}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <dl className="m-0 grid grid-cols-4 border-b border-dashed border-line-strong">
        {ticket.fields.map((f) => (
          <div key={f.key} className="flex flex-col items-center border-l border-sand py-3.5 first:border-l-0">
            <dt className="text-[11px] tracking-[0.06em] text-muted-ink uppercase">{f.key}</dt>
            <dd className="m-0 font-display text-[28px] font-extrabold">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-8 p-[26px]">
        {ticket.qrReady && canAct && qr?.token ? (
          <RotatingQR key={qr.token.token} qr={qr.token} onExpire={qr.onExpire} />
        ) : ticket.qrReady && canAct && qr && !qr.error ? (
          <div role="status" className="flex size-[231px] flex-col items-center justify-center gap-2.5 rounded-xl bg-paper text-center">
            <Loader2 className="size-9 animate-spin text-muted-ink motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-sm text-sub">Loading your entry QR…</span>
          </div>
        ) : (
          <div className="flex size-[231px] flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-line-strong p-5 text-center">
            <Lock className="size-9 text-muted-ink" aria-hidden="true" />
            <span className="font-semibold">{canAct && !qr?.error ? "QR not available yet" : "QR unavailable"}</span>
            <span className="text-[13px] text-muted-ink">
              {qr?.error ?? (canAct ? ticket.qrUnlockLabel : `This ticket is ${ticket.status.replace("_", " ")}.`)}
            </span>
          </div>
        )}
        <div className="flex min-w-[min(100%,260px)] flex-1 flex-col gap-3.5">
          <HolderRow initials={ticket.holderInitials} name={ticket.holderName} detail={ticket.holderDetail} size="lg" />
          <p className="rounded-[10px] bg-paper p-3.5 text-sm leading-normal text-sub">{ticket.entryInfo}</p>
          <div className="flex flex-wrap gap-2">
            {onAddToWallet ? (
              <Button variant="primary" size="lg" onClick={onAddToWallet}>
                Add to wallet
              </Button>
            ) : null}
            {transfer && canAct ? (
              <Button
                variant="outline"
                size="lg"
                aria-expanded={transfer.open}
                aria-controls={transferId}
                onClick={() => transfer.onOpenChange(!transfer.open)}
              >
                Transfer
              </Button>
            ) : null}
            {resaleHref && ticket.resaleAllowed && canAct ? (
              <LinkButton href={resaleHref} variant="outline" size="lg" className="font-normal">
                Resell
              </LinkButton>
            ) : null}
          </div>
          {ticket.status === "transfer_pending" ? (
            <Notice
              tone="warning"
              action={
                onCancelTransfer ? (
                  <Button variant="outline" onClick={onCancelTransfer}>
                    Cancel transfer
                  </Button>
                ) : undefined
              }
            >
              Waiting for the recipient to accept. The ticket comes back to you if they decline or don’t answer within 24 hours.
            </Notice>
          ) : null}
          {transfer?.successMessage ? <Notice tone="success">{transfer.successMessage}</Notice> : null}
          <div id={transferId}>
            {transfer?.open && canAct ? (
              <TransferForm
                mode={ticket.transferMode}
                note={ticket.transferNote}
                onSubmit={transfer.onSubmit}
                submitting={transfer.submitting}
                serverError={transfer.serverError}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- TransfersCard ---------- */

export const transfersCardPropsSchema = z.object({
  transfers: z.array(transferSchema),
  onAccept: zFn<(id: string) => Promise<void> | void>().optional(),
  onDecline: zFn<(id: string) => Promise<void> | void>().optional(),
  onCancel: zFn<(id: string) => Promise<void> | void>().optional(),
  busyId: z.string().optional(),
  title: z.string().min(1).optional(),
  emptyLabel: z.string().min(1).optional(),
  className: zClassName,
});

export type TransfersCardProps = z.input<typeof transfersCardPropsSchema>;

const transferStatusTone = {
  pending: "warning",
  accepted: "success",
  declined: "neutral",
  cancelled: "neutral",
  expired: "neutral",
} as const;

/** Organism · TransfersCard — tickets sent to you (accept / decline) or by you (cancel while pending). */
export function TransfersCard(props: TransfersCardProps) {
  validateProps("TransfersCard", transfersCardPropsSchema, props);
  const { transfers, onAccept, onDecline, onCancel, busyId, title = "Transfers", emptyLabel = "No transfers yet.", className } = props;
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6", className)}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {transfers.length === 0 ? <p className="text-sm text-sub">{emptyLabel}</p> : null}
      <ul className="m-0 flex list-none flex-col p-0">
        {transfers.map((t) => {
          const pending = t.status === "pending";
          const incoming = t.direction === "incoming";
          return (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 last:border-b-0">
              <div className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{t.eventTitle}</span>
                <span className="text-sm text-sub">
                  {t.seatLabel} · {dateTimeLabel(t.startsAt)}
                </span>
                <span className="text-[13px] text-muted-ink">
                  {incoming ? `From ${t.fromName}` : `To ${t.recipientLabel}`}
                  {pending ? ` · ${incoming ? "accept" : "waiting"} until ${dateTimeLabel(t.expiresAt)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={transferStatusTone[t.status]}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge>
                {pending && incoming && onDecline ? (
                  <Button
                    variant="outline"
                    onClick={() => onDecline(t.id)}
                    disabled={busyId === t.id}
                    aria-label={`Decline ticket for ${t.eventTitle}`}
                  >
                    Decline
                  </Button>
                ) : null}
                {pending && incoming && onAccept ? (
                  <Button
                    variant="pitch"
                    onClick={() => onAccept(t.id)}
                    loading={busyId === t.id}
                    aria-label={`Accept ticket for ${t.eventTitle}`}
                  >
                    Accept
                  </Button>
                ) : null}
                {pending && !incoming && onCancel ? (
                  <Button
                    variant="outline"
                    onClick={() => onCancel(t.id)}
                    loading={busyId === t.id}
                    aria-label={`Cancel transfer for ${t.eventTitle}`}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
