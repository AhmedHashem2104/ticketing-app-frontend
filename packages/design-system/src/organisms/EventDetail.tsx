import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventDetailSchema,
  formatMoney,
  presaleCodeRequestSchema,
  priceRowSchema,
  themeSchema,
  type PresaleCodeRequest,
} from "@repo/contracts";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppLink } from "../atoms/AppLink";
import { availabilityText, Badge } from "../atoms/Badge";
import { Button, LinkButton } from "../atoms/Button";
import { Input } from "../atoms/FormControls";
import { TeamCrest } from "../atoms/Identity";
import { Eyebrow, Heading } from "../atoms/Typography";
import { Card } from "../molecules/Content";
import { CheckoutSteps } from "../molecules/Navigation";
import { HoldTimer, CountdownTiles } from "../molecules/Time";
import { validateProps, zClassName, zDateString, zFn, zHref, zNode } from "../lib/props";
import { themeMuted, themeSurface } from "../lib/theme";
import { cn } from "../lib/utils";

const crumbSchema = z.object({ label: z.string().min(1), href: zHref.optional() });

function Breadcrumbs({ items, className }: { items: z.infer<typeof crumbSchema>[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
        {items.map((item, i) => (
          <li key={item.label} className="flex gap-1">
            {item.href ? (
              <AppLink href={item.href} underline>
                {item.label}
              </AppLink>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>{item.label}</span>
            )}
            {i < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- MatchHero ---------- */

export const matchHeroPropsSchema = z.object({
  event: eventDetailSchema.refine((e) => !!e.homeTeam && !!e.awayTeam, { error: "Match events need home and away teams" }),
  breadcrumbs: z.array(crumbSchema).min(1),
  className: zClassName,
});

export type MatchHeroProps = z.input<typeof matchHeroPropsSchema>;

/** Organism · MatchHero — green match header with crests, kick-off info and entry badges. */
export function MatchHero(props: MatchHeroProps) {
  validateProps("MatchHero", matchHeroPropsSchema, props);
  const { event, breadcrumbs, className } = props;
  const home = event.homeTeam!;
  const away = event.awayTeam!;
  return (
    <header className={cn(themeSurface[event.theme], className)}>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[22px] px-4 pt-8 pb-11 sm:px-8">
        <Breadcrumbs items={breadcrumbs} className="text-mint" />
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3" aria-hidden="true">
          <span className="flex items-center gap-4">
            <TeamCrest short={home.short} size="lg" />
            <span className="font-display text-[44px] leading-none font-extrabold uppercase md:text-[64px]">{home.name}</span>
          </span>
          <span className="font-display text-[40px] font-extrabold text-gold">VS</span>
          <span className="flex items-center gap-4">
            <span className="font-display text-[44px] leading-none font-extrabold uppercase md:text-[64px]">{away.name}</span>
            <TeamCrest short={away.short} size="lg" variant="dark" />
          </span>
        </div>
        <h1 className="text-lg font-medium text-mint md:text-xl">
          <span className="sr-only">{event.title}: </span>
          {event.headline}
        </h1>
        {event.badges.length ? (
          <ul aria-label="Entry rules" className="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px] font-semibold">
            {event.badges.map((badge, i) => (
              <li key={badge} className={cn("rounded-[14px] px-3 py-1.5", i === 0 ? "bg-gold text-ink" : "bg-white text-pitch")}>
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </header>
  );
}

/* ---------- ConcertHero ---------- */

export const concertHeroPropsSchema = z.object({
  event: eventDetailSchema,
  breadcrumbs: z.array(crumbSchema).min(1),
  className: zClassName,
});

export type ConcertHeroProps = z.input<typeof concertHeroPropsSchema>;

/** Organism · ConcertHero — poster, title and key facts for shows. */
export function ConcertHero(props: ConcertHeroProps) {
  validateProps("ConcertHero", concertHeroPropsSchema, props);
  const { event, breadcrumbs, className } = props;
  const [name, rest] = event.title.split(" — ");
  return (
    <header className={cn(themeSurface[event.theme], className)}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-10 px-4 pt-8 pb-11 sm:px-8">
        <div
          role="img"
          aria-label={`${event.title} poster`}
          className="flex h-[260px] w-full max-w-[320px] flex-col justify-between rounded-2xl bg-ink p-7 sm:h-80 sm:flex-[0_0_320px]"
        >
          <span className="font-mono text-xs text-gold">{event.tag.toUpperCase()}</span>
          <span className="font-display text-[56px] leading-[0.9] font-extrabold uppercase sm:text-[72px]">{name}</span>
          <span className="font-display text-[22px] font-bold text-gold uppercase">{rest ?? event.venue.area}</span>
        </div>
        <div className="flex min-w-[min(100%,320px)] flex-1 flex-col gap-[18px]">
          <Breadcrumbs items={breadcrumbs} className={themeMuted[event.theme]} />
          <Heading as="h1" size="5xl" className="leading-[0.95]">
            {event.title}
          </Heading>
          {event.subtitle ? <p className={cn("text-xl", themeMuted[event.theme])}>{event.subtitle}</p> : null}
          {event.facts?.length ? (
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 text-[15px]">
              {event.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5">
                  <dt className={cn("font-mono text-xs", themeMuted[event.theme])}>{fact.label}</dt>
                  <dd className="m-0 font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ---------- EventBanner ---------- */

export const eventBannerPropsSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  meta: z.string().min(1),
  theme: themeSchema,
  poster: z.boolean().optional(),
  trailing: zNode.optional(),
  className: zClassName,
});

export type EventBannerProps = z.input<typeof eventBannerPropsSchema>;

/** Organism · EventBanner — compact coloured strip above seat maps. */
export function EventBanner(props: EventBannerProps) {
  validateProps("EventBanner", eventBannerPropsSchema, props);
  const { eyebrow, title, meta, theme, poster, trailing, className } = props;
  return (
    <div className={cn(themeSurface[theme], className)}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-[22px] sm:px-8">
        <div className="flex items-center gap-[22px]">
          {poster ? (
            <div
              aria-hidden="true"
              className="relative flex h-[120px] w-[84px] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-b from-plum to-ink p-2 text-white shadow-md"
            >
              <span className="absolute -top-6 -right-6 size-16 rounded-full bg-gold/80" />
              <span className="relative font-mono text-[9px] tracking-[0.12em] text-gold">MATCHPASS</span>
              <span className="relative font-display text-[15px] leading-[0.95] font-extrabold uppercase">{title}</span>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <Eyebrow tone="gold" size="sm">
              {eyebrow}
            </Eyebrow>
            <Heading as="h1" size="2xl">
              {title}
            </Heading>
            <span className={cn("text-sm", themeMuted[theme])}>{meta}</span>
          </div>
        </div>
        {trailing}
      </div>
    </div>
  );
}

/* ---------- EventContextBar ---------- */

export const eventContextBarPropsSchema = z.object({
  title: z.string().min(1).optional(),
  meta: z.string().optional(),
  back: z.object({ label: z.string().min(1), href: zHref }).optional(),
  step: z.number().int().min(1).max(3),
  accent: z.enum(["pitch", "plum"]).optional(),
  expiresAt: zDateString.optional(),
  onExpire: zFn<() => void>().optional(),
  className: zClassName,
});

export type EventContextBarProps = z.input<typeof eventContextBarPropsSchema>;

/** Organism · EventContextBar — white bar with event, purchase steps and the hold timer. */
export function EventContextBar(props: EventContextBarProps) {
  validateProps("EventContextBar", eventContextBarPropsSchema, props);
  const { title, meta, back, step, accent, expiresAt, onExpire, className } = props;
  return (
    <div className={cn("border-b border-line bg-white", className)}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-8">
        {back ? (
          <AppLink href={back.href} tone="pitch" className="flex min-h-11 items-center text-sm">
            ← {back.label}
          </AppLink>
        ) : null}
        <div className="flex flex-1 flex-col gap-0.5">
          {title ? <span className="text-[17px] font-semibold">{title}</span> : null}
          {meta ? <span className="text-[13px] text-muted-ink">{meta}</span> : null}
        </div>
        <CheckoutSteps current={step} accent={accent} className="flex-wrap" />
        {expiresAt ? <HoldTimer expiresAt={expiresAt} onExpire={onExpire} /> : null}
      </div>
    </div>
  );
}

/* ---------- PriceTable ---------- */

export const priceTablePropsSchema = z.object({
  title: z.string().min(1),
  rows: z.array(priceRowSchema).min(1),
  note: z.string().optional(),
  variant: z.enum(["zones", "types"]).optional(),
  className: zClassName,
});

export type PriceTableProps = z.input<typeof priceTablePropsSchema>;

/** Organism · PriceTable — zone or ticket-type prices as a real data table. */
export function PriceTable(props: PriceTableProps) {
  validateProps("PriceTable", priceTablePropsSchema, props);
  const { title, rows, note, variant = "zones", className } = props;
  const th = "py-2.5 text-left font-mono text-xs font-normal text-muted-ink";
  const td = "border-t border-line py-3 pr-3 align-top";
  return (
    <Card title={title} className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-[15px]">
          <thead>
            <tr>
              <th scope="col" className={th}>
                {variant === "zones" ? "ZONE" : "TICKET"}
              </th>
              <th scope="col" className={th}>
                {variant === "zones" ? "WHERE" : "WHAT YOU GET"}
              </th>
              <th scope="col" className={th}>
                PRICE
              </th>
              {variant === "zones" ? (
                <th scope="col" className={th}>
                  AVAILABILITY
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row" className={cn(td, "text-left font-semibold")}>
                  {row.name}
                </th>
                <td className={cn(td, variant === "types" && "text-sub")}>{row.where}</td>
                <td className={td}>{formatMoney(row.price)}</td>
                {variant === "zones" ? <td className={cn(td, availabilityText[row.availability])}>{row.availabilityLabel}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="text-[13px] text-muted-ink">{note}</p> : null}
    </Card>
  );
}

/* ---------- GatesCard ---------- */

export const gatesCardPropsSchema = z.object({
  gates: z.array(z.object({ gates: z.string().min(1), area: z.string().min(1) })).min(1),
  note: z.string().optional(),
  className: zClassName,
});

export type GatesCardProps = z.input<typeof gatesCardPropsSchema>;

/** Organism · GatesCard — which gate serves which stand, with a mini stadium map. */
export function GatesCard(props: GatesCardProps) {
  validateProps("GatesCard", gatesCardPropsSchema, props);
  const { gates, note, className } = props;
  return (
    <section aria-labelledby="gates-title" className={cn("flex flex-wrap gap-6 rounded-xl border border-line bg-white p-6", className)}>
      <div className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-3">
        <Heading id="gates-title" size="lg">
          Stadium &amp; gates
        </Heading>
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[15px]">
          {gates.map((g) => (
            <div key={g.gates} className="contents">
              <dt className="font-semibold">{g.gates}</dt>
              <dd className="m-0">{g.area}</dd>
            </div>
          ))}
        </dl>
        {note ? <p className="text-sm leading-normal text-sub">{note}</p> : null}
      </div>
      <div
        aria-hidden="true"
        className="grid h-[220px] w-full max-w-[300px] grid-cols-[44px_minmax(0,1fr)_44px] grid-rows-[36px_minmax(0,1fr)_36px] gap-1.5 rounded-xl bg-forest p-2.5 text-center text-[11px] font-semibold text-ink"
      >
        <div />
        <div className="flex items-center justify-center rounded-md bg-mint">N · 1–4</div>
        <div />
        <div className="flex rotate-180 items-center justify-center rounded-md bg-white [writing-mode:vertical-rl]">W · 5–8</div>
        <div className="rounded border-2 border-white" />
        <div className="flex items-center justify-center rounded-md bg-mint [writing-mode:vertical-rl]">E · 9–12</div>
        <div />
        <div className="flex items-center justify-center rounded-md bg-sand">S · 13–14 away</div>
        <div />
      </div>
    </section>
  );
}

/* ---------- ListCard (rules) & RunningOrder ---------- */

export const listCardPropsSchema = z.object({ title: z.string().min(1), items: z.array(z.string().min(1)).min(1), className: zClassName });
export type ListCardProps = z.input<typeof listCardPropsSchema>;

/** Organism · ListCard — "Before you buy" / "Good to know" bullet card. */
export function ListCard(props: ListCardProps) {
  validateProps("ListCard", listCardPropsSchema, props);
  const { title, items, className } = props;
  return (
    <Card title={title} className={className}>
      <ul className="m-0 flex flex-col gap-1 pl-5 text-[15px] leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

export const runningOrderPropsSchema = z.object({
  items: z.array(z.object({ time: z.string().min(1), label: z.string().min(1), headline: z.boolean().optional() })).min(1),
  className: zClassName,
});
export type RunningOrderProps = z.input<typeof runningOrderPropsSchema>;

/** Organism · RunningOrder — the night's timetable. */
export function RunningOrder(props: RunningOrderProps) {
  validateProps("RunningOrder", runningOrderPropsSchema, props);
  const { items, className } = props;
  return (
    <Card title="Running order" className={className}>
      <ol className="m-0 list-none p-0 text-base">
        {items.map((item) => (
          <li key={item.time + item.label} className="grid grid-cols-[90px_minmax(0,1fr)] border-t border-line py-3">
            <time className="font-mono">{item.time}</time>
            <span className={cn(item.headline && "font-semibold")}>{item.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ---------- SaleCountdownCard ---------- */

export const saleCountdownCardPropsSchema = z.object({
  saleOpensAt: zDateString.optional(),
  priceFrom: z.number().nonnegative(),
  action: z.object({ label: z.string().min(1), href: zHref }),
  reminder: z.object({ active: z.boolean(), pending: z.boolean().optional(), onSet: zFn<() => void>() }).optional(),
  onAddToCalendar: zFn<() => void>().optional(),
  className: zClassName,
});

export type SaleCountdownCardProps = z.input<typeof saleCountdownCardPropsSchema>;

/** Organism · SaleCountdownCard — sticky buy box for matches. */
export function SaleCountdownCard(props: SaleCountdownCardProps) {
  validateProps("SaleCountdownCard", saleCountdownCardPropsSchema, props);
  const { saleOpensAt, priceFrom, action, reminder, onAddToCalendar, className } = props;
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-6", className)}>
      {saleOpensAt ? <CountdownTiles target={saleOpensAt} /> : null}
      <p className="text-sm text-sub">
        Tickets from <strong className="text-ink">{formatMoney(priceFrom)}</strong>
      </p>
      <LinkButton href={action.href} variant="primary" size="xl" block>
        {action.label}
      </LinkButton>
      {reminder || onAddToCalendar ? (
        <div className="flex gap-2">
          {reminder ? (
            <Button variant="outline" className="flex-1" onClick={reminder.onSet} loading={reminder.pending} disabled={reminder.active}>
              {reminder.active ? (
                <>
                  <Check aria-hidden="true" /> Reminder set
                </>
              ) : (
                "Set reminder"
              )}
            </Button>
          ) : null}
          {onAddToCalendar ? (
            <Button variant="outline" className="flex-1" onClick={onAddToCalendar}>
              Add to calendar
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- TicketsFromCard ---------- */

export const ticketsFromCardPropsSchema = z.object({
  priceFrom: z.number().nonnegative(),
  scarcityNote: z.string().optional(),
  action: z.object({ label: z.string().min(1), href: zHref }),
  footnote: z.string().optional(),
  presale: z
    .object({
      onApply: zFn<(code: string) => Promise<void> | void>(),
      appliedCode: z.string().optional(),
      error: z.string().optional(),
      pending: z.boolean().optional(),
    })
    .optional(),
  className: zClassName,
});

export type TicketsFromCardProps = z.input<typeof ticketsFromCardPropsSchema>;

/** Organism · TicketsFromCard — sticky buy box for shows, with an optional presale code form. */
export function TicketsFromCard(props: TicketsFromCardProps) {
  validateProps("TicketsFromCard", ticketsFromCardPropsSchema, props);
  const { priceFrom, scarcityNote, action, footnote, presale, className } = props;
  const form = useForm<PresaleCodeRequest, unknown, z.output<typeof presaleCodeRequestSchema>>({
    resolver: zodResolver(presaleCodeRequestSchema),
    defaultValues: { code: "" },
  });
  const error = form.formState.errors.code?.message ?? presale?.error;
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border border-line bg-white p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-sub">Tickets from</span>
        {scarcityNote ? <Badge tone="warning">{scarcityNote}</Badge> : null}
      </div>
      <span className="font-display text-[44px] leading-none font-extrabold">{formatMoney(priceFrom)}</span>
      <LinkButton href={action.href} variant="primary" size="xl" block>
        {action.label}
      </LinkButton>
      {presale ? (
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => presale.onApply(values.code))}
          className="flex flex-col gap-1.5 border-t border-line pt-3.5"
        >
          <label htmlFor="presale-code" className="text-sm font-semibold">
            Have a presale code?
          </label>
          <div className="flex gap-2">
            <Input
              id="presale-code"
              mono
              placeholder="e.g. LAYLA24"
              autoComplete="off"
              invalid={!!error}
              aria-describedby={error ? "presale-error" : presale.appliedCode ? "presale-ok" : undefined}
              className="min-w-0 flex-1 uppercase"
              {...form.register("code")}
            />
            <Button type="submit" variant="outline" loading={presale.pending}>
              Apply
            </Button>
          </div>
          {error ? (
            <span id="presale-error" role="alert" className="text-[13px] text-rose-ink">
              {error}
            </span>
          ) : presale.appliedCode ? (
            <span id="presale-ok" role="status" className="text-[13px] font-semibold text-pitch">
              Presale unlocked with {presale.appliedCode}
            </span>
          ) : null}
        </form>
      ) : null}
      {footnote ? <p className="text-[13px] text-muted-ink">{footnote}</p> : null}
    </div>
  );
}

/* ---------- PromoterCard ---------- */

export const promoterCardPropsSchema = z.object({ name: z.string().min(1), verified: z.boolean(), className: zClassName });
export type PromoterCardProps = z.input<typeof promoterCardPropsSchema>;

/** Organism · PromoterCard */
export function PromoterCard(props: PromoterCardProps) {
  validateProps("PromoterCard", promoterCardPropsSchema, props);
  const { name, verified, className } = props;
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border border-line bg-white px-[18px] py-4 text-sm", className)}>
      <Eyebrow size="sm">Presented by</Eyebrow>
      <span className="font-semibold">{name}</span>
      {verified ? <span className="font-semibold text-pitch">Verified organiser</span> : null}
    </div>
  );
}
