import { zodResolver } from "@hookform/resolvers/zod";
import {
  entryScanSchema,
  eventRequestSchema,
  fanIdReviewSchema,
  refundReviewSchema,
  rejectionSchema,
  staffLoginRequestSchema,
  type EntryScan,
  type StaffLoginRequest,
  type StaffRole,
} from "@repo/contracts";
import { msg } from "@repo/i18n";
import { CheckCircle2, ShieldAlert, TriangleAlert, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { DevAutofillButton } from "../atoms/DevAutofill";
import { Input, NativeSelect, Textarea } from "../atoms/FormControls";
import { Avatar, Logo } from "../atoms/Identity";
import { Thumbnail } from "../atoms/Media";
import { Heading } from "../atoms/Typography";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { DetailList, Notice } from "../molecules/Content";
import { Field } from "../molecules/Form";
import { devSamples, fillForm } from "../lib/dev-samples";
import { useI18n } from "../lib/provider";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";
import { cn } from "../lib/utils";
import { refundStatusTone, requestStatusTone, scanResultTone } from "./Data";

/* ---------- ActionDialog ---------- */

export const actionDialogPropsSchema = z.object({
  open: z.boolean(),
  onOpenChange: zFn<(open: boolean) => void>(),
  title: z.string().min(1),
  description: zNode.optional(),
  confirmLabel: z.string().min(1),
  tone: z.enum(["danger", "confirm"]).optional(),
  /** `required`: a reason the fan (or organiser) will read, at least 5 characters. */
  reason: z.enum(["required", "none"]).optional(),
  reasonLabel: z.string().min(1).optional(),
  onConfirm: zFn<(reason: string | undefined) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  children: zNode.optional(),
});
export type ActionDialogProps = z.input<typeof actionDialogPropsSchema>;

/**
 * Organism · ActionDialog — confirms a decision that changes what fans see (reject, cancel, suspend),
 * optionally asking for the reason that will be sent to them.
 */
export function ActionDialog(props: ActionDialogProps) {
  validateProps("ActionDialog", actionDialogPropsSchema, props);
  const {
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    tone = "confirm",
    reason = "none",
    reasonLabel,
    onConfirm,
    submitting,
    serverError,
    children,
  } = props;
  const { t } = useI18n();
  const form = useForm<{ reason: string }>({
    resolver: reason === "required" ? zodResolver(rejectionSchema) : undefined,
    defaultValues: { reason: "" },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-white">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => onConfirm(reason === "required" ? v.reason.trim() : undefined))}
        >
          <DialogHeader className="text-start">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            {description ? <DialogDescription className="text-[15px] text-muted-ink">{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          {reason === "required" ? (
            <>
              <DevAutofillButton onFill={() => fillForm(form, { reason: devSamples.staffReason })} />
              <Field
                label={reasonLabel ?? t("Reason")}
                hint={t("Shown to the people affected.")}
                error={form.formState.errors.reason?.message}
                required
              >
                <Textarea rows={3} {...form.register("reason")} />
              </Field>
            </>
          ) : null}
          {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant={tone === "danger" ? "destructive" : "pitch"} size="lg" loading={submitting}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- FanIdReviewCard ---------- */

export const fanIdReviewCardPropsSchema = z.object({
  headingLevel: z.enum(["h2", "h3"]).optional(),
  review: fanIdReviewSchema,
  onApprove: zFn<() => void>(),
  onReject: zFn<() => void>(),
  busy: z.boolean().optional(),
  className: zClassName,
});
export type FanIdReviewCardProps = z.input<typeof fanIdReviewCardPropsSchema>;

const documentLabels = { national_id: msg("National ID"), passport: msg("Passport") } as const;

/**
 * Organism · FanIdReviewCard — one flagged Fan ID application: the document and selfie side by side,
 * the names and number read from the document, the automatic face-match score and its flags.
 */
export function FanIdReviewCard(props: FanIdReviewCardProps) {
  validateProps("FanIdReviewCard", fanIdReviewCardPropsSchema, props);
  const { review, onApprove, onReject, busy, headingLevel: H = "h2", className } = props;
  const { t, f } = useI18n();
  const score = Math.round(review.matchScore * 100);
  const weak = review.matchScore < 0.75;
  return (
    <article
      aria-label={review.fullName}
      className={cn("flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Avatar initials={review.initials} size="md" />
        <div className="flex min-w-0 flex-1 flex-col">
          <H className="text-[17px] font-semibold">{review.fullName}</H>
          <span className="text-[13px] text-muted-ink">
            <bdi dir="ltr">{review.phoneMasked}</bdi> · {t("Submitted {date}", { date: f.dateTimeLabel(review.submittedAt) })}
          </span>
        </div>
        <Badge tone={weak ? "danger" : "warning"}>{t(documentLabels[review.documentType])}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="m-0 flex flex-col gap-1.5">
          <img
            src={review.documentImageUrl}
            alt={t("ID document of {name}", { name: review.fullName })}
            loading="lazy"
            className="aspect-[1.58] w-full rounded-lg border border-line bg-paper object-contain"
          />
          <figcaption className="text-[12px] text-muted-ink">{t(documentLabels[review.documentType])}</figcaption>
        </figure>
        <figure className="m-0 flex flex-col gap-1.5">
          <img
            src={review.selfieImageUrl}
            alt={t("Selfie of {name}", { name: review.fullName })}
            loading="lazy"
            className="aspect-[1.58] w-full rounded-lg border border-line bg-paper object-contain"
          />
          <figcaption className="text-[12px] text-muted-ink">{t("Selfie")}</figcaption>
        </figure>
      </div>
      <DetailList
        items={[
          { label: t("Name (English)"), value: review.nameEn },
          { label: t("Name (Arabic)"), value: <bdi dir="rtl">{review.nameAr}</bdi> },
          {
            label: t("Document number"),
            value: (
              <bdi dir="ltr" className="font-mono">
                {review.idNumberMasked}
              </bdi>
            ),
          },
          {
            label: t("Face match"),
            value: (
              <span className="inline-flex items-center gap-2">
                <span className={cn("font-semibold", weak ? "text-rose-ink" : "text-pitch")}>
                  <bdi>{f.number(score)}%</bdi>
                </span>
                <span className="text-[13px] font-normal text-muted-ink">
                  {weak ? t("Below the 75% threshold") : t("Above the 75% threshold")}
                </span>
              </span>
            ),
          },
        ]}
      />
      {review.flags.length ? (
        <ul aria-label={t("Why it needs a person")} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {review.flags.map((flag) => (
            <li
              key={flag}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-[13px] font-medium text-amber-ink"
            >
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              {flag}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="pitch" size="lg" onClick={onApprove} loading={busy}>
          {t("Approve Fan ID")}
        </Button>
        <Button variant="outline-danger" size="lg" onClick={onReject} disabled={busy}>
          {t("Reject")}
        </Button>
      </div>
    </article>
  );
}

/* ---------- RefundReviewCard ---------- */

export const refundReviewCardPropsSchema = z.object({
  headingLevel: z.enum(["h2", "h3"]).optional(),
  refund: refundReviewSchema,
  onApprove: zFn<() => void>().optional(),
  onReject: zFn<() => void>().optional(),
  busy: z.boolean().optional(),
  className: zClassName,
});
export type RefundReviewCardProps = z.input<typeof refundReviewCardPropsSchema>;

/** Organism · RefundReviewCard — a refund request with amount, destination and the fan's reason. */
export function RefundReviewCard(props: RefundReviewCardProps) {
  validateProps("RefundReviewCard", refundReviewCardPropsSchema, props);
  const { refund, onApprove, onReject, busy, headingLevel: H = "h2", className } = props;
  const { t, f } = useI18n();
  const decidable = refund.status === "in_review" && onApprove && onReject;
  return (
    <article
      aria-label={`${refund.reference} · ${refund.customer}`}
      className={cn("flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-start gap-3">
        <Thumbnail src={refund.imageUrl} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <H className="text-[16px] font-semibold">{refund.eventTitle}</H>
          <span className="text-[13px] text-muted-ink">
            <bdi className="font-mono">{refund.reference}</bdi> · {refund.customer} · {f.dateTimeLabel(refund.requestedAt)}
          </span>
        </div>
        <Badge tone={refundStatusTone[refund.status]}>{refund.statusLabel}</Badge>
      </div>
      <DetailList
        items={[
          { label: t("Amount"), value: f.money(refund.amount) },
          { label: t("Refund to"), value: refund.destination },
          { label: t("Tickets"), value: refund.detail },
          { label: t("Reason"), value: refund.reason },
        ]}
      />
      {decidable ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="pitch" size="lg" onClick={onApprove} loading={busy}>
            {t("Approve refund")}
          </Button>
          <Button variant="outline-danger" size="lg" onClick={onReject} disabled={busy}>
            {t("Reject")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/* ---------- RequestCard ---------- */

export const requestCardPropsSchema = z.object({
  headingLevel: z.enum(["h2", "h3"]).optional(),
  request: eventRequestSchema,
  /** Admins decide; organisers only see where their request stands. */
  onApprove: zFn<() => void>().optional(),
  onReject: zFn<() => void>().optional(),
  busy: z.boolean().optional(),
  className: zClassName,
});
export type RequestCardProps = z.input<typeof requestCardPropsSchema>;

const requestTypeLabels = { cancel: msg("Cancel the event"), postpone: msg("Postpone the event") } as const;
const requestStatusLabels = { pending: msg("Waiting for an admin"), approved: msg("Approved"), rejected: msg("Not approved") } as const;

/** Organism · RequestCard — an organiser's request to cancel or postpone, and the admin's decision. */
export function RequestCard(props: RequestCardProps) {
  validateProps("RequestCard", requestCardPropsSchema, props);
  const { request, onApprove, onReject, busy, headingLevel: H = "h2", className } = props;
  const { t, f } = useI18n();
  return (
    <article
      aria-label={request.eventTitle}
      className={cn("flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <H className="text-[16px] font-semibold">{request.eventTitle}</H>
          <span className="text-[13px] text-muted-ink">
            {request.organizerName} · {request.requestedBy} · {f.dateTimeLabel(request.createdAt)}
          </span>
        </div>
        <Badge tone={requestStatusTone[request.status]}>{t(requestStatusLabels[request.status])}</Badge>
      </div>
      <p className="text-[15px]">
        <strong>{t(requestTypeLabels[request.type])}.</strong> <span dir="auto">{request.reason}</span>
      </p>
      {request.decisionNote || request.decidedBy ? (
        <p className="rounded-lg bg-paper px-3 py-2 text-[14px] text-sub">
          {request.decidedBy ? <strong>{request.decidedBy}: </strong> : null}
          <span dir="auto">{request.decisionNote ?? t(requestStatusLabels[request.status])}</span>
        </p>
      ) : null}
      {request.status === "pending" && onApprove && onReject ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button variant={request.type === "cancel" ? "destructive" : "pitch"} size="lg" onClick={onApprove} loading={busy}>
            {request.type === "cancel" ? t("Approve and cancel event") : t("Approve and postpone event")}
          </Button>
          <Button variant="outline" size="lg" onClick={onReject} disabled={busy}>
            {t("Reject")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/* ---------- ScanPanel ---------- */

const scanFormSchema = z.object({
  gate: z.string().trim().min(1, { error: "Enter the gate" }).max(20),
  token: z.string().trim().min(1, { error: "Scan or paste the ticket QR" }),
});
type ScanForm = z.input<typeof scanFormSchema>;

export const scanPanelPropsSchema = z.object({
  gates: z.array(z.string().min(1)).min(1),
  onScan: zFn<(values: { gate: string; token: string }) => Promise<void> | void>(),
  /** Development: fetches a live QR for an unused ticket, so the scanner can be tried without a phone. */
  onSampleToken: zFn<() => Promise<string>>().optional(),
  lastScan: entryScanSchema.optional(),
  scanning: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});
export type ScanPanelProps = z.input<typeof scanPanelPropsSchema>;

const scanIcons: Record<EntryScan["result"], typeof CheckCircle2> = {
  admitted: CheckCircle2,
  already_used: ShieldAlert,
  expired: TriangleAlert,
  invalid: XCircle,
  not_valid: XCircle,
};

/**
 * Organism · ScanPanel — the gate scanner: pick the gate, scan (a handheld scanner types the QR and
 * presses Enter) and see a big admit / refuse result announced to screen readers.
 */
export function ScanPanel(props: ScanPanelProps) {
  validateProps("ScanPanel", scanPanelPropsSchema, props);
  const { gates, onScan, onSampleToken, lastScan, scanning, serverError, className } = props;
  const { t, f } = useI18n();
  const form = useForm<ScanForm, unknown, z.output<typeof scanFormSchema>>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: { gate: gates[0]!, token: "" },
  });
  const e = form.formState.errors;
  const Icon = lastScan ? scanIcons[lastScan.result] : null;
  // Gate ids are English ("Gate 3"); show them in the page's language.
  const gateLabel = (gate: string) => {
    const number = /^Gate (\d+)$/.exec(gate)?.[1];
    return number ? t("Gate {number}", { number }) : gate;
  };
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <form
        noValidate
        aria-label={t("Scan a ticket")}
        className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:p-5"
        onSubmit={form.handleSubmit(async (v) => {
          await onScan(v);
          form.setValue("token", "");
          form.setFocus("token");
        })}
      >
        {onSampleToken ? (
          <DevAutofillButton
            label={t("Use a sample ticket")}
            onFill={async () => {
              try {
                fillForm(form, { token: await onSampleToken() });
              } catch (error) {
                // e.g. every ticket for this event has already been scanned.
                form.setError("token", { message: error instanceof Error ? error.message : t("Something went wrong") });
              }
            }}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
          <Field label={t("Gate")} error={e.gate?.message}>
            <NativeSelect options={gates.map((g) => ({ value: g, label: gateLabel(g) }))} {...form.register("gate")} />
          </Field>
          <Field label={t("Ticket QR")} error={e.token?.message}>
            <Input mono autoComplete="off" spellCheck={false} placeholder="MPQ1.…" className="h-12" dir="ltr" {...form.register("token")} />
          </Field>
          <Button type="submit" variant="pitch" size="xl" loading={scanning}>
            {t("Check ticket")}
          </Button>
        </div>
        {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
      </form>
      <div role="status" aria-live="assertive" className="min-h-0">
        {lastScan && Icon ? (
          <div
            className={cn(
              "flex items-center gap-4 rounded-xl px-5 py-4",
              lastScan.result === "admitted" ? "bg-pitch text-white" : "bg-rose-ink text-white",
            )}
          >
            <Icon className="size-10 shrink-0" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-[22px] leading-tight font-bold">
                {lastScan.result === "admitted" ? t("Let in") : t("Do not let in")}
              </span>
              <span className="text-[15px] text-white/90">
                {lastScan.resultLabel} · <bdi>{lastScan.holderName}</bdi> · <bdi className="font-mono">{lastScan.ticketCode}</bdi> ·{" "}
                {f.timeLabel(lastScan.at)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Molecule · ScanResultBadge — a scan's outcome in the recent-scans table. */
export function ScanResultBadge({ scan }: { scan: Pick<EntryScan, "result" | "resultLabel"> }) {
  return <Badge tone={scanResultTone[scan.result]}>{scan.resultLabel}</Badge>;
}

/* ---------- StaffLoginForm ---------- */

export const staffLoginFormPropsSchema = z.object({
  onSubmit: zFn<(values: z.output<typeof staffLoginRequestSchema>) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  /** Development: one-click sign-in per role (the seeded staff accounts). */
  demoAccounts: z
    .array(z.object({ role: z.enum(["admin", "operations", "organizer"]), email: z.email(), label: z.string().min(1) }))
    .optional(),
  languageSwitch: zNode.optional(),
  className: zClassName,
});
export type StaffLoginFormProps = z.input<typeof staffLoginFormPropsSchema>;

/** Organism · StaffLoginForm — staff sign-in by work email, with per-role autofill in development. */
export function StaffLoginForm(props: StaffLoginFormProps) {
  validateProps("StaffLoginForm", staffLoginFormPropsSchema, props);
  const { onSubmit, submitting, serverError, demoAccounts = [], languageSwitch, className } = props;
  const { t } = useI18n();
  const form = useForm<StaffLoginRequest, unknown, z.output<typeof staffLoginRequestSchema>>({
    resolver: zodResolver(staffLoginRequestSchema),
    defaultValues: { email: "", password: "" },
  });
  const e = form.formState.errors;
  const fill = (email: string) => fillForm(form, { email, password: devSamples.staffPassword });
  return (
    <div className={cn("flex min-h-dvh items-center justify-center bg-ink px-4 py-10", className)}>
      <form
        noValidate
        aria-labelledby="staff-login-title"
        onSubmit={form.handleSubmit((v) => onSubmit(v))}
        className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-2xl bg-white p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <Logo size="sm" />
          {languageSwitch}
        </div>
        <div className="flex flex-col gap-1.5">
          <Heading as="h1" id="staff-login-title" size="xl">
            {t("Staff sign in")}
          </Heading>
          <p className="text-[15px] text-muted-ink">{t("For Matchpass admins, operations and event organisers.")}</p>
        </div>
        {demoAccounts.length ? (
          <div className="flex flex-wrap gap-2">
            {demoAccounts.map((account) => (
              <DevAutofillButton key={account.email} label={t(account.label)} onFill={() => fill(account.email)} />
            ))}
          </div>
        ) : null}
        <Field label={t("Work email")} error={e.email?.message} required>
          <Input type="email" autoComplete="username" dir="ltr" className="h-12" {...form.register("email")} />
        </Field>
        <Field label={t("Password")} error={e.password?.message} required>
          <Input type="password" autoComplete="current-password" className="h-12" {...form.register("password")} />
        </Field>
        {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
        <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText={t("Signing in…")}>
          {t("Sign in")}
        </Button>
      </form>
    </div>
  );
}

/** Demo account labels for the development autofill buttons, by role. */
export const staffDemoLabels: Record<StaffRole, string> = {
  admin: msg("Autofill admin"),
  operations: msg("Autofill operations"),
  organizer: msg("Autofill organiser"),
};
