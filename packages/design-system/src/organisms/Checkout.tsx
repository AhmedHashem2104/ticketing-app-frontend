import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFormSchema, holdSchema, orderSchema, paymentMethodSchema, promoRequestSchema, type PaymentMethod } from "@repo/contracts";
import { msg } from "@repo/i18n";
import { Check, Loader2, Lock, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, LinkButton } from "../atoms/Button";
import { CoverImage } from "../atoms/Media";
import { Input, RadioGroup } from "../atoms/FormControls";
import { Eyebrow, Heading } from "../atoms/Typography";
import { HolderRow, Notice, NumberedStep } from "../molecules/Content";
import { CheckboxField, Field, OptionCard } from "../molecules/Form";
import { validateProps, zClassName, zFn, zHref, zNode } from "../lib/props";
import { themeSurface } from "../lib/theme";
import { cn } from "../lib/utils";
import { DevAutofillButton } from "../atoms/DevAutofill";
import { devSamples, fillForm } from "../lib/dev-samples";
import { useI18n } from "../lib/provider";

/* ---------- CheckoutForm ---------- */

/** Flat form model — mapped onto the API's discriminated `payment` union on submit. */
const checkoutFlatSchema = z
  .object({
    method: paymentMethodSchema,
    walletPhone: z.string(),
    acceptTerms: z.boolean(),
  })
  .transform((flat, ctx) => {
    const payment = flat.method === "wallet" ? { method: "wallet" as const, walletPhone: flat.walletPhone } : { method: flat.method };
    const result = checkoutFormSchema.safeParse({ payment, acceptTerms: flat.acceptTerms });
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", message: issue.message, path: [String(issue.path[issue.path.length - 1])] });
      }
      return z.NEVER;
    }
    return result.data;
  });

export type CheckoutFlatValues = z.input<typeof checkoutFlatSchema>;
export type CheckoutSubmitValues = z.output<typeof checkoutFlatSchema>;

export const checkoutFormPropsSchema = z.object({
  hold: holdSchema,
  onSubmit: zFn<(values: CheckoutSubmitValues) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  promo: z
    .object({
      onApply: zFn<(code: string) => Promise<void> | void>(),
      error: z.string().optional(),
      pending: z.boolean().optional(),
    })
    .optional(),
  providerName: z.string().optional(),
  className: zClassName,
});

export type CheckoutFormProps = z.input<typeof checkoutFormPropsSchema>;

const METHODS: { id: PaymentMethod; name: string; note: string; info?: string }[] = [
  {
    id: "card",
    name: msg("Debit or credit card"),
    note: msg("Visa, Mastercard, Meeza"),
    info: msg("You’ll enter your card on our payment provider’s secure page, then come straight back here."),
  },
  { id: "wallet", name: msg("Mobile wallet"), note: msg("Pay from your phone wallet") },
  {
    id: "instapay",
    name: msg("InstaPay"),
    note: msg("Instant bank transfer"),
    info: msg("You’ll approve the payment in your bank’s InstaPay app. Tickets are issued as soon as it arrives."),
  },
  {
    id: "fawry",
    name: msg("Fawry reference"),
    note: msg("Pay cash at any Fawry outlet"),
    info: msg("We’ll give you a reference number and keep your tickets for 48 hours. They’re issued as soon as you pay."),
  },
];

/** Organism · CheckoutForm — payment method, terms and pay action, validated with zod. */
export function CheckoutForm(props: CheckoutFormProps) {
  validateProps("CheckoutForm", checkoutFormPropsSchema, props);
  const { t, f } = useI18n();
  const { hold, onSubmit, submitting, serverError, promo, providerName = t("our payment provider"), className } = props;
  const form = useForm<CheckoutFlatValues, unknown, CheckoutSubmitValues>({
    resolver: zodResolver(checkoutFlatSchema),
    defaultValues: {
      method: "card",
      walletPhone: "",
      acceptTerms: true,
    },
    mode: "onTouched",
  });
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string>();
  const method = useWatch({ control: form.control, name: "method" });
  const errors = form.formState.errors;
  const total = f.money(hold.total);
  const cta =
    method === "card"
      ? t("Pay {total}", { total })
      : method === "wallet"
        ? t("Pay {total} with wallet", { total })
        : method === "instapay"
          ? t("Pay {total} with InstaPay", { total })
          : t("Get Fawry reference");

  const applyPromo = async () => {
    const parsed = promoRequestSchema.safeParse({ code: promoCode });
    if (!parsed.success) {
      setPromoError(parsed.error.issues[0]?.message);
      return;
    }
    setPromoError(undefined);
    await promo?.onApply(parsed.data.code);
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className={cn("flex flex-wrap items-start gap-7", className)}
    >
      <div className="flex min-w-[min(100%,560px)] flex-[1_1_620px] flex-col gap-5">
        <DevAutofillButton
          onFill={() => {
            fillForm(form, { walletPhone: devSamples.walletPhone, acceptTerms: true });
            if (promo) setPromoCode(devSamples.promoCode);
          }}
        />
        <Heading as="h1" size="2xl">
          {t("Checkout")}
        </Heading>
        <section aria-labelledby="holders-title" className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px]">
          <h2 id="holders-title" className="text-lg font-semibold">
            {hold.holdersTitle}
          </h2>
          {hold.holders.map((holder) => (
            <HolderRow
              key={holder.name + holder.detail}
              initials={holder.initials}
              avatarUrl={holder.avatarUrl}
              name={holder.name}
              detail={holder.detail}
              bordered
            />
          ))}
          <p className="text-[13px] text-muted-ink">{hold.holdersNote}</p>
        </section>
        <fieldset className="m-0 flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px]">
          <legend className="float-start pb-1.5 text-lg font-semibold">{t("Pay with")}</legend>
          <Controller
            control={form.control}
            name="method"
            render={({ field }) => (
              <RadioGroup
                aria-label={t("Payment method")}
                value={field.value}
                onValueChange={(v) => field.onChange(v as PaymentMethod)}
                className="clear-both gap-2.5"
              >
                {METHODS.map((m) => (
                  <OptionCard key={m.id} value={m.id} title={t(m.name)} description={t(m.note)} selected={field.value === m.id} size="lg">
                    {m.id === "wallet" ? (
                      <Field
                        label={t("Wallet phone number")}
                        error={errors.walletPhone?.message}
                        hint={t("Egyptian mobile number, without +20")}
                      >
                        <Input type="tel" mono autoComplete="tel-national" placeholder="10 0000 0000" {...form.register("walletPhone")} />
                      </Field>
                    ) : m.info ? (
                      <p className="text-sm leading-normal text-sub">{t(m.info)}</p>
                    ) : null}
                  </OptionCard>
                ))}
              </RadioGroup>
            )}
          />
          <p className="flex items-center gap-2 pt-1 text-xs text-muted-ink">
            <Lock className="size-4" aria-hidden="true" />
            {t("Payments processed securely by {provider}. Your card details never reach Matchpass.", { provider: providerName })}
          </p>
        </fieldset>
      </div>

      <aside aria-label={t("Order summary")} className="flex min-w-[min(100%,320px)] flex-[0_1_400px] flex-col gap-4 lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className={cn("relative isolate flex flex-col gap-1 px-[22px] py-[18px]", themeSurface[hold.theme])}>
            <CoverImage src={hold.imageUrl} theme={hold.theme} />
            <Eyebrow tone="gold" size="sm">
              {hold.eventTag}
            </Eyebrow>
            <span className="font-display text-[28px] leading-none font-extrabold uppercase">{hold.eventTitle}</span>
            <span className="text-sm text-sand">{hold.eventMeta}</span>
          </div>
          <div className="flex flex-col gap-2.5 px-[22px] py-5">
            <ul aria-label={t("Price breakdown")} className="m-0 flex list-none flex-col gap-2.5 p-0">
              {hold.lines.map((line) => (
                <li key={line.label} className={cn("flex justify-between gap-3 text-[15px]", line.amount < 0 && "text-pitch")}>
                  <span>{line.label}</span>
                  <span className="font-mono">{line.amount < 0 ? `− ${f.amount(-line.amount)}` : f.amount(line.amount)}</span>
                </li>
              ))}
            </ul>
            {promo ? (
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex gap-2">
                  <label htmlFor="promo" className="sr-only">
                    {t("Promo code")}
                  </label>
                  <Input
                    id="promo"
                    placeholder={t("Promo code")}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    invalid={!!(promoError ?? promo.error)}
                    aria-describedby={(promoError ?? promo.error) ? "promo-error" : undefined}
                    className="min-w-0 flex-1"
                  />
                  <Button variant="outline" onClick={applyPromo} loading={promo.pending}>
                    {t("Apply")}
                  </Button>
                </div>
                {(promoError ?? promo.error) ? (
                  <span id="promo-error" role="alert" className="text-[13px] text-rose-ink">
                    {t(promoError ?? promo.error ?? "")}
                  </span>
                ) : hold.promoCode ? (
                  <span role="status" className="flex items-center gap-1 text-[13px] font-semibold text-pitch">
                    <Check className="size-3.5" aria-hidden="true" /> {t("{code} applied", { code: hold.promoCode })}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-semibold">{t("Total (incl. VAT)")}</span>
              <span className="font-display text-[34px] leading-none font-extrabold">{total}</span>
            </div>
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <CheckboxField
                  label={t("I agree to the terms of sale and the refund policy.")}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  error={errors.acceptTerms?.message}
                />
              )}
            />
            {serverError ? <Notice tone="danger">{t(serverError)}</Notice> : null}
            <Button type="submit" variant="pitch" size="2xl" block loading={submitting} loadingText={t("Processing payment…")}>
              {cta}
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}

/* ---------- Order confirmation ---------- */

export const orderHeroPropsSchema = z.object({
  title: z.string().min(1),
  reference: z.string().min(1),
  note: z.string().min(1),
  pending: z.boolean().optional(),
  className: zClassName,
});

export type OrderHeroProps = z.input<typeof orderHeroPropsSchema>;

/** Organism · OrderHero — "You're going" confirmation header. */
export function OrderHero(props: OrderHeroProps) {
  validateProps("OrderHero", orderHeroPropsSchema, props);
  const { title, reference, note, pending, className } = props;
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col items-center gap-3.5 text-center", className)}>
      <span className={cn("flex size-20 items-center justify-center rounded-full", pending ? "bg-gold" : "bg-pitch")} aria-hidden="true">
        <Check className={cn("size-10", pending ? "text-ink" : "text-white")} strokeWidth={2.5} />
      </span>
      <Heading as="h1" size="4xl">
        {title}
      </Heading>
      <p className="text-[17px] text-sub">
        {t("Order")} <span className="font-mono text-ink">{reference}</span> · {note}
      </p>
    </div>
  );
}

export const orderPaymentStatusPropsSchema = z.object({
  order: orderSchema.refine((o) => o.status !== "paid", { error: "Use OrderHero for paid orders" }),
  retryHref: zHref.optional(),
  eventHref: zHref.optional(),
  className: zClassName,
});
export type OrderPaymentStatusProps = z.input<typeof orderPaymentStatusPropsSchema>;

/**
 * Organism · OrderPaymentStatus — an order whose payment isn't complete: waiting for a wallet or
 * InstaPay approval, a Fawry bill to pay, a card page to finish, or a failed / expired payment.
 */
export function OrderPaymentStatus(props: OrderPaymentStatusProps) {
  validateProps("OrderPaymentStatus", orderPaymentStatusPropsSchema, props);
  const { order, retryHref, eventHref, className } = props;
  const { payment } = order;
  const { t, f } = useI18n();
  const deadline = payment.expiresAt
    ? t("{day} at {time}", { day: f.dayLabel(payment.expiresAt), time: f.timeLabel(payment.expiresAt) })
    : undefined;

  if (order.status === "payment_failed" || order.status === "expired") {
    const failed = order.status === "payment_failed";
    return (
      <section aria-labelledby="payment-status-title" className={cn("flex flex-col items-center gap-4 text-center", className)}>
        <span className="flex size-20 items-center justify-center rounded-full bg-rose-soft" aria-hidden="true">
          <X className="size-10 text-rose-ink" strokeWidth={2.5} />
        </span>
        <Heading as="h1" id="payment-status-title" size="4xl">
          {failed ? t("Payment didn’t go through") : t("This order expired")}
        </Heading>
        <p className="text-[17px] text-sub">
          {t("Order")} <span className="font-mono text-ink">{order.reference}</span> ·{" "}
          {failed
            ? t(payment.failureReason ?? "You haven’t been charged.")
            : t("It wasn’t paid in time, so the tickets went back on sale.")}
        </p>
        {failed && retryHref ? (
          <LinkButton href={retryHref} variant="pitch" size="xl">
            {t("Try paying again")}
          </LinkButton>
        ) : eventHref ? (
          <LinkButton href={eventHref} variant="primary" size="xl">
            {t("Choose tickets again")}
          </LinkButton>
        ) : null}
      </section>
    );
  }

  const isFawry = payment.method === "fawry";
  const isCard = payment.method === "card";
  return (
    <section aria-labelledby="payment-status-title" className={cn("flex flex-col items-center gap-5 text-center", className)}>
      <span className="flex size-20 items-center justify-center rounded-full bg-gold" aria-hidden="true">
        {isFawry ? (
          <ReceiptText className="size-10 text-ink" />
        ) : (
          <Loader2 className="size-10 animate-spin text-ink motion-reduce:animate-none" />
        )}
      </span>
      <Heading as="h1" id="payment-status-title" size="4xl">
        {isFawry ? t("Almost there") : isCard ? t("Finish paying by card") : t("Waiting for your payment")}
      </Heading>
      <p className="text-[17px] text-sub">
        {t("Order")} <span className="font-mono text-ink">{order.reference}</span> · {f.money(order.total)}
      </p>
      {isFawry && payment.reference ? (
        <div className="flex w-full flex-col gap-1 rounded-2xl border border-line bg-white p-6">
          <span className="text-sm text-muted-ink">{t("Fawry reference")}</span>
          <span className="font-mono text-[34px] font-bold tracking-[0.12em]">{payment.reference}</span>
          {deadline ? <span className="text-sm text-sub">{t("Pay before {deadline}", { deadline })}</span> : null}
        </div>
      ) : null}
      {payment.instructions ? (
        <Notice tone="info" className="w-full text-start">
          {payment.instructions}
        </Notice>
      ) : null}
      {isCard && payment.redirectUrl ? (
        <Button asChild variant="pitch" size="xl">
          <a href={payment.redirectUrl}>{t("Continue to secure payment")}</a>
        </Button>
      ) : null}
      {!isFawry && !isCard ? (
        <p role="status" className="text-sm text-muted-ink">
          {t("This page updates by itself once the payment arrives.")}
        </p>
      ) : null}
    </section>
  );
}

export const orderSummaryStripPropsSchema = z.object({ order: orderSchema, className: zClassName });
export type OrderSummaryStripProps = z.input<typeof orderSummaryStripPropsSchema>;

/** Organism · OrderSummaryStrip — event panel beside holders, seats and payment. */
export function OrderSummaryStrip(props: OrderSummaryStripProps) {
  validateProps("OrderSummaryStrip", orderSummaryStripPropsSchema, props);
  const { order, className } = props;
  const { t, f } = useI18n();
  return (
    <section
      aria-label={t("Order details")}
      className={cn("flex flex-wrap overflow-hidden rounded-2xl border border-line bg-white", className)}
    >
      <div className={cn("relative isolate flex flex-[1_1_320px] flex-col gap-2 p-[26px]", themeSurface[order.theme])}>
        <CoverImage src={order.imageUrl} theme={order.theme} />
        <Eyebrow tone="gold" size="sm">
          {order.eventTag}
        </Eyebrow>
        <span className="font-display text-[40px] leading-none font-extrabold uppercase">{order.eventTitle}</span>
        <span className="text-[15px] text-mint">{order.eventMeta}</span>
        <span className="text-[15px] text-mint">{order.entryNote}</span>
      </div>
      <ul className="m-0 flex flex-[1_1_320px] list-none flex-col gap-3 p-[26px]">
        {order.tickets.map((ticket, i) => (
          <li key={ticket.id} className={cn("flex flex-wrap justify-between gap-2 text-[15px]", i > 0 && "border-t border-line pt-3")}>
            <span>
              {ticket.holderName}
              {ticket.eventKind === "match" ? ` · ${ticket.holderDetail.split(" · ")[0]}` : ""}
            </span>
            <span className="font-semibold">{ticket.seatLabel}</span>
          </li>
        ))}
        {order.payment.reference ? (
          <li className="flex justify-between gap-2 text-[15px]">
            <span>{t("Fawry reference")}</span>
            <span className="font-mono font-semibold">{order.payment.reference}</span>
          </li>
        ) : null}
        <li className={cn("flex justify-between gap-2 text-[15px]", order.tickets.length > 0 && "border-t border-line pt-3")}>
          <span>{order.paymentLabel}</span>
          <span className="font-mono font-semibold">{f.money(order.total)}</span>
        </li>
      </ul>
    </section>
  );
}

export const nextStepsPropsSchema = z.object({
  steps: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
  className: zClassName,
});
export type NextStepsProps = z.input<typeof nextStepsPropsSchema>;

/** Organism · NextSteps — "What happens next" numbered cards. */
export function NextSteps(props: NextStepsProps) {
  validateProps("NextSteps", nextStepsPropsSchema, props);
  const { steps, className } = props;
  const { t } = useI18n();
  return (
    <section aria-labelledby="next-title" className={cn("flex flex-col gap-3", className)}>
      <Heading id="next-title" size="lg">
        {t("What happens next")}
      </Heading>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 p-0">
        {steps.map((step, i) => (
          <li key={step.title}>
            <NumberedStep index={i + 1} title={step.title} className="h-full">
              {step.body}
            </NumberedStep>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const upsellBannerPropsSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  actionLabel: z.string().min(1),
  onAction: zFn<() => void>(),
  done: z.boolean().optional(),
  doneLabel: z.string().optional(),
  children: zNode.optional(),
  className: zClassName,
});
export type UpsellBannerProps = z.input<typeof upsellBannerPropsSchema>;

/** Organism · UpsellBanner — e.g. "Add parking for this match". */
export function UpsellBanner(props: UpsellBannerProps) {
  validateProps("UpsellBanner", upsellBannerPropsSchema, props);
  const { t } = useI18n();
  const { title, detail, actionLabel, onAction, done, doneLabel = t("Added"), className } = props;
  return (
    <section
      aria-label={title}
      className={cn("flex flex-wrap items-center gap-5 rounded-2xl bg-ink px-[26px] py-[22px] text-white", className)}
    >
      <div className="flex flex-[1_1_300px] flex-col gap-1">
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="text-sm text-ash">{detail}</span>
      </div>
      <Button variant="primary" size="lg" onClick={onAction} disabled={done}>
        {done ? (
          <>
            <Check aria-hidden="true" /> {doneLabel}
          </>
        ) : (
          actionLabel
        )}
      </Button>
    </section>
  );
}
