import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatMoney,
  payoutMethodSchema,
  RESALE_MIN_PRICE,
  resaleListingRequestSchema,
  resaleListingSchema,
  resaleQuote,
  type PayoutMethod,
  type ResaleListingRequest,
} from "@repo/contracts";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "../atoms/Button";
import { Input, NativeSelect, RadioGroup, Slider } from "../atoms/FormControls";
import { Heading } from "../atoms/Typography";
import { ListingRow, Notice, NumberedStep } from "../molecules/Content";
import { Field, OptionCard } from "../molecules/Form";
import { validateProps, zClassName, zFn } from "../lib/props";
import { cn } from "../lib/utils";

/* ---------- ResaleForm ---------- */

export const resaleFormPropsSchema = z.object({
  tickets: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1), price: z.number().positive() }))
    .min(1, { error: "There are no tickets to sell" }),
  defaultTicketId: z.string().optional(),
  payoutOptions: z.array(z.object({ id: payoutMethodSchema, name: z.string().min(1), note: z.string().min(1) })).min(1),
  onSubmit: zFn<(values: z.output<typeof resaleListingRequestSchema>) => Promise<void> | void>(),
  submitting: z.boolean().optional(),
  serverError: z.string().optional(),
  className: zClassName,
});

export type ResaleFormProps = z.input<typeof resaleFormPropsSchema>;

/** Organism · ResaleForm — list a ticket at up to face value with a live payout breakdown. */
export function ResaleForm(props: ResaleFormProps) {
  validateProps("ResaleForm", resaleFormPropsSchema, props);
  const { tickets, defaultTicketId, payoutOptions, onSubmit, submitting, serverError, className } = props;
  const initial = tickets.find((t) => t.id === defaultTicketId) ?? tickets[0]!;
  const form = useForm<ResaleListingRequest, unknown, z.output<typeof resaleListingRequestSchema>>({
    resolver: zodResolver(resaleListingRequestSchema),
    defaultValues: { ticketId: initial.id, price: initial.price, payoutMethod: payoutOptions[0]!.id, iban: "" },
  });
  const ticketId = useWatch({ control: form.control, name: "ticketId" });
  const price = useWatch({ control: form.control, name: "price" });
  const ticket = tickets.find((t) => t.id === ticketId) ?? initial;
  const max = ticket.price;
  const min = Math.min(RESALE_MIN_PRICE, max);
  const quote = resaleQuote(price);

  useEffect(() => {
    // Selecting another ticket resets the price to its face value.
    form.setValue("price", ticket.price);
  }, [ticket.id, ticket.price, form]);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className={cn("flex flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-[22px]", className)}
    >
      <Field label="Ticket to sell" labelSize="md" error={form.formState.errors.ticketId?.message}>
        <NativeSelect options={tickets.map((t) => ({ value: t.id, label: t.label }))} {...form.register("ticketId")} />
      </Field>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <label id="price-label" htmlFor="resale-price" className="text-[15px] font-semibold">
            Your price
          </label>
          <span className="font-display text-[40px] font-extrabold" aria-hidden="true">
            {formatMoney(price)}
          </span>
        </div>
        <Controller
          control={form.control}
          name="price"
          render={({ field }) => (
            <Slider
              id="resale-price"
              aria-labelledby="price-label"
              aria-valuetext={formatMoney(field.value)}
              min={min}
              max={max}
              step={5}
              value={Math.min(Math.max(field.value, min), max)}
              onValueChange={field.onChange}
              className="h-8"
            />
          )}
        />
        <div className="flex justify-between text-[13px] text-muted-ink">
          <span>{formatMoney(min)}</span>
          <span>Max {formatMoney(max)} — the face value</span>
        </div>
        {form.formState.errors.price ? (
          <span role="alert" className="text-[13px] text-rose-ink">
            {form.formState.errors.price.message}
          </span>
        ) : null}
      </div>
      <dl className="m-0 flex flex-col gap-2 rounded-xl bg-paper p-4 text-[15px]" aria-live="polite">
        <div className="flex justify-between">
          <dt>Buyer pays</dt>
          <dd className="m-0 font-mono">{formatMoney(quote.price)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Resale fee (5%)</dt>
          <dd className="m-0 font-mono">− {formatMoney(quote.fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <dt>You receive</dt>
          <dd className="m-0 font-mono text-pitch">{formatMoney(quote.payout)}</dd>
        </div>
      </dl>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="pb-2 text-[15px] font-semibold">Get paid to</legend>
        <Controller
          control={form.control}
          name="payoutMethod"
          render={({ field }) => (
            <RadioGroup
              aria-label="Get paid to"
              value={field.value}
              onValueChange={(v) => field.onChange(v as PayoutMethod)}
              className="gap-2"
            >
              {payoutOptions.map((option) => (
                <OptionCard
                  key={option.id}
                  value={option.id}
                  title={option.name}
                  description={option.note}
                  selected={field.value === option.id}
                >
                  {option.id === "bank" ? (
                    <Field label="IBAN" error={form.formState.errors.iban?.message} hint="EG followed by 27 digits">
                      <Input mono autoComplete="off" placeholder="EG38 0019 0005 0000 0000 2631 8000 2" {...form.register("iban")} />
                    </Field>
                  ) : null}
                </OptionCard>
              ))}
            </RadioGroup>
          )}
        />
      </fieldset>
      {serverError ? <Notice tone="danger">{serverError}</Notice> : null}
      <Button type="submit" variant="pitch" size="xl" block loading={submitting} loadingText="Listing…">
        List ticket for {formatMoney(price)}
      </Button>
    </form>
  );
}

/* ---------- ResaleInfoPanel ---------- */

export const resaleInfoPanelPropsSchema = z.object({ steps: z.array(z.string().min(1)).min(1), className: zClassName });
export type ResaleInfoPanelProps = z.input<typeof resaleInfoPanelPropsSchema>;

/** Organism · ResaleInfoPanel — "How official resale works". */
export function ResaleInfoPanel(props: ResaleInfoPanelProps) {
  validateProps("ResaleInfoPanel", resaleInfoPanelPropsSchema, props);
  const { steps, className } = props;
  return (
    <section aria-labelledby="resale-how" className={cn("flex flex-col gap-3.5 rounded-2xl bg-ink p-6 text-white", className)}>
      <Heading id="resale-how" size="md">
        How official resale works
      </Heading>
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {steps.map((step, i) => (
          <li key={step}>
            <NumberedStep index={i + 1} tone="inverse">
              {step}
            </NumberedStep>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- ListingsCard ---------- */

export const listingsCardPropsSchema = z.object({
  listings: z.array(resaleListingSchema),
  onWithdraw: zFn<(listingId: string) => void>().optional(),
  withdrawingId: z.string().optional(),
  className: zClassName,
});

export type ListingsCardProps = z.input<typeof listingsCardPropsSchema>;

/** Organism · ListingsCard — your active and sold resale listings. */
export function ListingsCard(props: ListingsCardProps) {
  validateProps("ListingsCard", listingsCardPropsSchema, props);
  const { listings, onWithdraw, withdrawingId, className } = props;
  return (
    <section
      aria-labelledby="listings-title"
      className={cn("flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-[22px]", className)}
    >
      <h2 id="listings-title" className="text-[17px] font-semibold">
        Your listings
      </h2>
      {listings.length === 0 ? <p className="text-sm text-muted-ink">You haven&apos;t listed any tickets yet.</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingRow
              title={listing.title}
              detail={listing.detail}
              status={listing.status === "sold" ? "Sold" : "Listed"}
              tone={listing.status === "sold" ? "success" : "warning"}
              action={
                listing.status === "listed" && onWithdraw ? (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onWithdraw(listing.id)}
                    loading={withdrawingId === listing.id}
                    aria-label={`Withdraw ${listing.title}`}
                  >
                    Withdraw
                  </Button>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
