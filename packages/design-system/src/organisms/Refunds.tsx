import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatMoney,
  refundOptionsSchema,
  refundReasonLabels,
  refundReasonSchema,
  refundRequestSchema,
  refundSchema,
  type RefundMethod,
  type RefundReason,
  type RefundRequestInput,
} from "@repo/contracts";
import { Check } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../atoms/Badge";
import { Button, LinkButton } from "../atoms/Button";
import { Checkbox, RadioGroup, Textarea } from "../atoms/FormControls";
import { Eyebrow, Heading } from "../atoms/Typography";
import { DetailList, Notice, SummaryRow } from "../molecules/Content";
import { CheckboxField, Field, OptionCard } from "../molecules/Form";
import { StepProgress } from "../molecules/Navigation";
import { validateProps, zClassName, zFn, zHref } from "../lib/props";
import { cn } from "../lib/utils";
import { StubTicket } from "./Tickets";

const STEPS = ["Tickets", "Reason", "Refund method", "Confirm", "Done"];
const TITLES = ["Request a refund", "Tell us why", "Choose refund method", "Confirm your refund", "Refund requested"];
const STEP_FIELDS: FieldPath<RefundRequestInput>[][] = [["ticketIds"], ["reason", "details"], ["method"], ["acknowledge"]];

/* ---------- RefundWizard ---------- */

export const refundWizardPropsSchema = z.object({
  options: refundOptionsSchema.refine((o) => o.tickets.length > 0, { error: "There are no refundable tickets on this order" }),
  step: z.number().int().min(1).max(5),
  onStepChange: zFn<(step: number) => void>(),
  onSubmit: zFn<(values: z.output<typeof refundRequestSchema>) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  result: refundSchema.optional(),
  trackHref: zHref,
  ticketsHref: zHref,
  className: zClassName,
});

export type RefundWizardProps = z.input<typeof refundWizardPropsSchema>;

/** Organism · RefundWizard — five-step refund request, validated per step. */
export function RefundWizard(props: RefundWizardProps) {
  validateProps("RefundWizard", refundWizardPropsSchema, props);
  const { options, step, onStepChange, onSubmit, submitting, serverError, result, trackHref, ticketsHref, className } = props;
  const form = useForm<RefundRequestInput, unknown, z.output<typeof refundRequestSchema>>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      orderId: options.orderId,
      ticketIds: options.tickets.map((t) => t.id),
      reason: "cant_attend",
      details: "",
      method: options.methods[0]?.id ?? "card",
    },
  });
  const [blockMsg, setBlockMsg] = useState<string>();
  const values = useWatch({ control: form.control }) as RefundRequestInput;
  const method = options.methods.find((m) => m.id === values.method) ?? options.methods[0]!;
  const chosen = options.tickets.filter((t) => values.ticketIds.includes(t.id));
  const base = chosen.reduce((sum, t) => sum + t.price, 0);
  const bonus = Math.round(base * method.bonusRate);

  const next = async () => {
    const fields = STEP_FIELDS[step - 1] ?? [];
    const ok = await form.trigger(fields);
    if (!ok) {
      const first = fields.map((f) => form.getFieldState(f).error?.message).find(Boolean);
      setBlockMsg(first ?? "Check this step");
      return;
    }
    setBlockMsg(undefined);
    if (step === 4) {
      await form.handleSubmit((v) => onSubmit(v))();
      return;
    }
    onStepChange(step + 1);
  };

  const back = () => {
    setBlockMsg(undefined);
    onStepChange(Math.max(1, step - 1));
  };

  return (
    <div className={cn("flex flex-col gap-[22px]", className)}>
      <div className="flex flex-col gap-2">
        <Eyebrow size="sm" className="font-semibold">
          Order {options.reference} · {options.eventTitle} · {options.eventDateLabel}
        </Eyebrow>
        <Heading as="h1" font="ticket" size="2xl">
          {TITLES[step - 1]}
        </Heading>
      </div>
      <StepProgress steps={STEPS} current={step} />
      <div className="flex flex-wrap items-start gap-7">
        <section
          aria-label={TITLES[step - 1]}
          className="flex min-w-[min(100%,560px)] flex-[1_1_620px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-[26px]"
        >
          {step === 1 ? (
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="pb-3 text-lg font-semibold">Which tickets do you want to refund?</legend>
              <Controller
                control={form.control}
                name="ticketIds"
                render={({ field }) => (
                  <>
                    {options.tickets.map((ticket) => {
                      const checked = field.value.includes(ticket.id);
                      const id = `refund-${ticket.id}`;
                      return (
                        <div
                          key={ticket.id}
                          className={cn(
                            "flex min-h-[92px] overflow-hidden rounded-xl",
                            checked ? "border-2 border-pitch" : "border border-line",
                          )}
                        >
                          <div className="flex flex-1 items-center gap-3.5 border-t-[6px] border-lime bg-white px-[18px] py-4">
                            <Checkbox
                              id={id}
                              checked={checked}
                              onCheckedChange={(on) =>
                                field.onChange(on ? [...field.value, ticket.id] : field.value.filter((x) => x !== ticket.id))
                              }
                              aria-describedby={`${id}-meta`}
                            />
                            <span className="flex flex-col gap-0.5">
                              <label htmlFor={id} className="cursor-pointer font-ticket text-base font-extrabold uppercase">
                                {ticket.label}
                              </label>
                              <span id={`${id}-meta`} className="text-[13px] text-muted-ink">
                                {ticket.meta}
                              </span>
                            </span>
                          </div>
                          <span className="flex w-[110px] flex-col items-center justify-center gap-0.5 bg-lime sm:w-[130px]">
                            <span className="font-ticket text-xl font-black">{ticket.price.toLocaleString("en-US")}</span>
                            <span className="text-[11px]">EGP</span>
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              />
              <Notice tone="success" icon={false} live="off">
                <strong>{options.deadlineNote}.</strong> You get the full ticket price back. The service fee (
                {formatMoney(options.serviceFeePerTicket)} per ticket) isn&apos;t refundable.
              </Notice>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="pb-3 text-lg font-semibold">Why are you asking for a refund?</legend>
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <RadioGroup
                    aria-label="Reason"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as RefundReason)}
                    className="gap-2.5"
                  >
                    {refundReasonSchema.options.map((reason) => (
                      <OptionCard key={reason} value={reason} title={refundReasonLabels[reason]} selected={field.value === reason} />
                    ))}
                  </RadioGroup>
                )}
              />
              {values.reason === "other" ? (
                <Field label="Tell us more" optionalLabel="(optional)" error={form.formState.errors.details?.message}>
                  <Textarea rows={3} {...form.register("details")} />
                </Field>
              ) : null}
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="pb-3 text-lg font-semibold">Where should we send the money?</legend>
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <RadioGroup
                    aria-label="Refund method"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as RefundMethod)}
                    className="gap-2.5"
                  >
                    {options.methods.map((m) => (
                      <OptionCard
                        key={m.id}
                        value={m.id}
                        title={m.name}
                        description={m.note}
                        tag={m.tag}
                        tagTone={m.bonusRate > 0 ? "success" : "neutral"}
                        selected={field.value === m.id}
                        size="lg"
                      />
                    ))}
                  </RadioGroup>
                )}
              />
            </fieldset>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3.5">
              <h2 className="text-lg font-semibold">Check and confirm</h2>
              <DetailList
                items={[
                  { label: "Tickets", value: chosen.map((t) => t.label).join(", ") || "—" },
                  { label: "Reason", value: refundReasonLabels[values.reason] },
                  { label: "Refund to", value: method.name },
                  { label: "Arrives", value: method.time },
                ]}
              />
              <Controller
                control={form.control}
                name="acknowledge"
                render={({ field }) => (
                  <CheckboxField
                    tone="warning"
                    label="I understand that once the refund is approved these tickets are cancelled and their QR codes stop working."
                    checked={field.value === true}
                    onCheckedChange={(on) => field.onChange(on ? true : undefined)}
                  />
                )}
              />
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col items-center gap-[22px] text-center">
              <span className="flex size-[76px] items-center justify-center rounded-full bg-pitch" aria-hidden="true">
                <Check className="size-[38px] text-white" strokeWidth={2.5} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="font-ticket text-[30px] font-black uppercase">Request sent</h2>
                <span className="text-[15px] text-sub">
                  Reference <span className="font-mono text-ink">{result?.reference ?? "—"}</span> · we&apos;ll update you by SMS and email
                </span>
              </div>
              {result ? <RefundTracker steps={result.steps} /> : null}
              <div className="flex flex-wrap justify-center gap-2.5">
                <LinkButton href={trackHref} variant="primary" size="xl">
                  Track refund
                </LinkButton>
                <LinkButton href={ticketsHref} variant="outline" size="xl" className="font-medium">
                  Back to my tickets
                </LinkButton>
              </div>
            </div>
          ) : null}

          {serverError && step === 4 ? <Notice tone="danger">{serverError}</Notice> : null}

          {step < 5 ? (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-[18px]">
              <Button variant="outline" size="lg" onClick={back} disabled={step === 1}>
                Back
              </Button>
              <span role="alert" className="flex-1 text-right text-[13px] text-rose-ink">
                {blockMsg}
              </span>
              <Button variant="pitch" size="lg" onClick={next} loading={submitting} loadingText="Submitting…">
                {step === 4 ? "Submit refund request" : "Continue"}
              </Button>
            </div>
          ) : null}
        </section>

        <aside
          aria-label="Refund summary"
          className="flex min-w-[min(100%,300px)] flex-[0_1_380px] flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px] lg:sticky lg:top-6"
        >
          <h2 className="text-lg font-semibold">Refund summary</h2>
          <SummaryRow label={`Tickets (${chosen.length})`} amount={base} />
          <SummaryRow label="Service fees (kept)" amount={options.serviceFeePerTicket * chosen.length} variant="muted" />
          {bonus > 0 ? <SummaryRow label={`Credit bonus +${Math.round(method.bonusRate * 100)}%`} amount={bonus} variant="bonus" /> : null}
          <div className="flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="font-semibold">You get back</span>
            <span className="font-ticket text-[28px] font-black" aria-live="polite">
              {formatMoney(base + bonus)}
            </span>
          </div>
          <span className="text-[13px] text-muted-ink">To: {method.name}</span>
          <p className="rounded-[10px] bg-paper p-3 text-[13px] leading-normal text-muted-ink">
            Your tickets stay valid until the refund is approved. Can&apos;t make it but refund window closed? Use official resale.
          </p>
        </aside>
      </div>
    </div>
  );
}

/* ---------- RefundTracker ---------- */

export const refundTrackerPropsSchema = z.object({ steps: refundSchema.shape.steps, className: zClassName });
export type RefundTrackerProps = z.input<typeof refundTrackerPropsSchema>;

const stepTone = {
  done: { bar: "bg-pitch", text: "text-pitch", sr: "completed" },
  current: { bar: "bg-gold", text: "text-ink", sr: "in progress" },
  todo: { bar: "bg-line", text: "text-muted-ink", sr: "not started" },
  failed: { bar: "bg-rose-ink", text: "text-rose-ink", sr: "stopped" },
} as const;

/** Organism · RefundTracker — Requested → Reviewing → Approved → Money sent. */
export function RefundTracker(props: RefundTrackerProps) {
  validateProps("RefundTracker", refundTrackerPropsSchema, props);
  const { steps, className } = props;
  return (
    <ol
      aria-label="Refund progress"
      className={cn("m-0 grid w-full list-none gap-2 p-0 text-left", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s) => (
        <li
          key={s.label}
          aria-current={s.state === "current" || s.state === "failed" ? "step" : undefined}
          className="flex flex-col gap-1.5 text-[13px]"
        >
          <span aria-hidden="true" className={cn("h-1.5 rounded-[3px]", stepTone[s.state].bar)} />
          <strong className={stepTone[s.state].text}>
            {s.label}
            <span className="sr-only"> ({stepTone[s.state].sr})</span>
          </strong>
          <span className="text-muted-ink">{s.when}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- RefundStatusCard ---------- */

export const refundStatusCardPropsSchema = z.object({
  refund: refundSchema,
  onCancel: zFn<(refundId: string) => void>().optional(),
  cancelling: z.boolean().optional(),
  onSecondary: zFn<(refundId: string) => void>().optional(),
  className: zClassName,
});

export type RefundStatusCardProps = z.input<typeof refundStatusCardPropsSchema>;

const statusTone = { in_review: "warning", refunded: "success", rejected: "danger", cancelled: "neutral" } as const;
const noteTone = { neutral: "bg-paper text-sub", success: "bg-mint text-pitch", danger: "bg-rose-soft text-rose-ink" } as const;

/** Organism · RefundStatusCard — one refund with its tracker, note and actions. */
export function RefundStatusCard(props: RefundStatusCardProps) {
  validateProps("RefundStatusCard", refundStatusCardPropsSchema, props);
  const { refund, onCancel, cancelling, onSecondary, className } = props;
  return (
    <article
      aria-labelledby={`refund-${refund.id}`}
      className={cn("flex flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow size="sm" className="font-semibold">
            {refund.reference} · Requested {refund.requestedLabel}
          </Eyebrow>
          <h2 id={`refund-${refund.id}`} className="font-ticket text-2xl font-black uppercase">
            {refund.eventTitle}
          </h2>
          <span className="text-sm text-sub">{refund.detail}</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone[refund.status]} size="md">
            {refund.statusLabel}
          </Badge>
          <span className="font-ticket text-[26px] font-black">{formatMoney(refund.amount)}</span>
          <span className="text-[13px] text-muted-ink">{refund.destination}</span>
        </div>
      </div>
      <RefundTracker steps={refund.steps} />
      {refund.note ? (
        <p className={cn("rounded-[10px] px-3.5 py-3 text-sm leading-normal", noteTone[refund.noteTone])}>{refund.note}</p>
      ) : null}
      {refund.refundedTicket ? <StubTicket ticket={refund.refundedTicket} cut="white" /> : null}
      <div className="flex flex-wrap gap-2">
        {refund.canCancel && onCancel ? (
          <Button variant="outline-danger" onClick={() => onCancel(refund.id)} loading={cancelling}>
            Cancel request — keep my tickets
          </Button>
        ) : null}
        {onSecondary ? (
          <Button variant="outline" onClick={() => onSecondary(refund.id)}>
            {refund.secondaryAction}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

/* ---------- RefundPolicyCards ---------- */

export const refundPolicyCardsPropsSchema = z.object({
  policies: z.array(z.object({ title: z.string().min(1), body: z.string().min(1), tone: z.enum(["ink", "lime", "plum"]) })).min(1),
  className: zClassName,
});

export type RefundPolicyCardsProps = z.input<typeof refundPolicyCardsPropsSchema>;

const policyTone = {
  ink: "bg-ink text-white [&_p]:text-chalk",
  lime: "bg-lime text-ink",
  plum: "bg-plum text-white [&_p]:text-lilac",
} as const;

/** Organism · RefundPolicyCards — refund rules per event type. */
export function RefundPolicyCards(props: RefundPolicyCardsProps) {
  validateProps("RefundPolicyCards", refundPolicyCardsPropsSchema, props);
  const { policies, className } = props;
  return (
    <section aria-label="Refund policies" className={cn("grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4", className)}>
      {policies.map((policy) => (
        <div key={policy.title} className={cn("flex flex-col gap-2 rounded-2xl p-[22px]", policyTone[policy.tone])}>
          <h2 className="font-ticket text-lg font-black uppercase">{policy.title}</h2>
          <p className="text-sm leading-normal">{policy.body}</p>
        </div>
      ))}
    </section>
  );
}
