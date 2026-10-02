import { cityLabels, citySchema, eventDetailSchema, eventSummarySchema, type City, type EventSummary } from "@repo/contracts";
import { z } from "zod";
import { LinkButton } from "../atoms/Button";
import { Checkbox, Input } from "../atoms/FormControls";
import { TeamCrest } from "../atoms/Identity";
import { CoverImage } from "../atoms/Media";
import { Skeleton } from "../atoms/Feedback";
import { Eyebrow, Heading } from "../atoms/Typography";
import { AppLink } from "../atoms/AppLink";
import { EmptyState, ErrorState } from "../molecules/Content";
import { ComingSoonRow, EventCard, EventRow } from "../molecules/Events";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zFn, zHref, zNode } from "../lib/props";
import { themeMuted, themeSurface } from "../lib/theme";
import { cn } from "../lib/utils";
import { useI18n } from "../lib/provider";

const actionSchema = z.object({ label: z.string().min(1), href: zHref });

/* ---------- FeaturedEventCard ---------- */

export const featuredEventCardPropsSchema = z.object({
  event: eventDetailSchema,
  primaryAction: actionSchema,
  secondaryAction: actionSchema,
  className: zClassName,
});

export type FeaturedEventCardProps = z.input<typeof featuredEventCardPropsSchema>;

function SaleOpensIn({ at, className }: { at: string; className?: string }) {
  const { t } = useI18n();
  const remaining = useCountdown(at);
  const d = Math.floor(remaining / 86_400);
  const h = String(Math.floor((remaining % 86_400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  // Server and browser read the clock a moment apart; the first tick after hydration corrects it.
  return (
    <span className={cn("font-mono text-sm", className)} suppressHydrationWarning>
      {remaining > 0 ? t("Sale opens in {days}d {hours}:{minutes}", { days: d, hours: h, minutes: m }) : t("Sale open now")}
    </span>
  );
}

/** Organism · FeaturedEventCard — big hero card on the home page (match or show). */
export function FeaturedEventCard(props: FeaturedEventCardProps) {
  validateProps("FeaturedEventCard", featuredEventCardPropsSchema, props);
  const { event, primaryAction, secondaryAction, className } = props;
  const isMatch = event.kind === "match" && event.homeTeam && event.awayTeam;
  const muted = themeMuted[event.theme];
  const { t, f } = useI18n();
  return (
    <article
      aria-labelledby={`featured-${event.id}`}
      className={cn(
        "relative isolate flex min-h-[380px] flex-col gap-[22px] overflow-hidden rounded-2xl p-6 sm:p-9",
        themeSurface[event.theme],
        className,
      )}
    >
      <CoverImage src={event.imageUrl} theme={event.theme} />
      <Eyebrow tone="gold">
        {event.tag}
        {isMatch ? ` · ${t("Derby")}` : event.kind === "concert" ? ` · ${t("One night only")}` : ""}
      </Eyebrow>
      {isMatch ? (
        <h2 id={`featured-${event.id}`} aria-label={event.title} className="flex flex-col gap-2.5">
          {[event.homeTeam!, event.awayTeam!].map((team, i) => (
            <span key={team.short} className="flex items-center gap-4">
              <TeamCrest short={team.short} src={team.logoUrl} variant={i === 0 ? "light" : "dark"} />
              <span className="font-display text-[40px] leading-none font-extrabold uppercase sm:text-[56px]">{team.name}</span>
            </span>
          ))}
        </h2>
      ) : (
        <div className="flex flex-col gap-1.5">
          <h2 id={`featured-${event.id}`} className="font-display text-[52px] leading-[0.95] font-extrabold uppercase sm:text-[76px]">
            {event.title.split(" — ")[0]}
          </h2>
          {event.subtitle ? (
            <p className={cn("text-lg", muted)}>
              {event.title.split(" — ")[1] ?? ""} · {event.subtitle.replace(/^with special guests /, "with ")}
            </p>
          ) : null}
        </div>
      )}
      <p className={cn("text-base", muted)}>
        {f.dayLabel(event.startsAt)} · {event.doorsAt ? t("Doors {time}", { time: event.doorsAt }) : f.timeLabel(event.startsAt)} ·{" "}
        {event.venue.name}, {event.venue.area}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-4">
        <LinkButton href={primaryAction.href} variant="primary" size="xl">
          {primaryAction.label}
        </LinkButton>
        <LinkButton href={secondaryAction.href} variant="outline-inverse" size="xl">
          {secondaryAction.label}
        </LinkButton>
        {event.saleOpensAt ? (
          <SaleOpensIn at={event.saleOpensAt} className={muted} />
        ) : event.scarcityNote ? (
          <span className={cn("text-sm", muted)}>{event.scarcityNote}</span>
        ) : null}
      </div>
    </article>
  );
}

/* ---------- EventGrid ---------- */

export const eventGridPropsSchema = z.object({
  title: z.string().min(1),
  events: z.array(eventSummarySchema),
  hrefFor: zFn<(event: EventSummary) => string>(),
  seeAll: actionSchema.optional(),
  emptyText: z.string().optional(),
  className: zClassName,
});

export type EventGridProps = z.input<typeof eventGridPropsSchema>;

/** Organism · EventGrid — titled grid of event cards. */
export function EventGrid(props: EventGridProps) {
  validateProps("EventGrid", eventGridPropsSchema, props);
  const { t } = useI18n();
  const { title, events, hrefFor, seeAll, emptyText = t("No events in this category yet."), className } = props;
  return (
    <section aria-labelledby="event-grid-title" className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Heading id="event-grid-title" size="xl">
          {title}
        </Heading>
        {seeAll ? (
          <AppLink href={seeAll.href} tone="pitch">
            {seeAll.label} <span className="inline-block rtl:-scale-x-100">→</span>
          </AppLink>
        ) : null}
      </div>
      {events.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 p-0">
          {events.map((event) => (
            <li key={event.id} className="flex">
              <EventCard event={event} href={hrefFor(event)} className="flex-1" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={emptyText} />
      )}
    </section>
  );
}

/* ---------- ComingSoonList ---------- */

export const comingSoonListPropsSchema = z.object({
  events: z.array(eventSummarySchema).min(1),
  notifiedIds: z.array(z.string()),
  pendingId: z.string().optional(),
  onNotify: zFn<(event: EventSummary) => void>().optional(),
  className: zClassName,
});

export type ComingSoonListProps = z.input<typeof comingSoonListPropsSchema>;

/** Organism · ComingSoonList — upcoming on-sales with notify buttons. */
export function ComingSoonList(props: ComingSoonListProps) {
  validateProps("ComingSoonList", comingSoonListPropsSchema, props);
  const { events, notifiedIds, pendingId, onNotify, className } = props;
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="coming-soon-title"
      className={cn("flex flex-col gap-1 rounded-xl border border-line bg-white p-6", className)}
    >
      <Heading id="coming-soon-title" size="md" className="pb-2">
        {t("Coming soon")}
      </Heading>
      {events.map((event) => (
        <ComingSoonRow
          key={event.id}
          event={event}
          notified={notifiedIds.includes(event.id)}
          pending={pendingId === event.id}
          onNotify={onNotify ? () => onNotify(event) : undefined}
        />
      ))}
    </section>
  );
}

/* ---------- CalloutPanel ---------- */

export const calloutPanelPropsSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  action: actionSchema,
  className: zClassName,
});

export type CalloutPanelProps = z.input<typeof calloutPanelPropsSchema>;

/** Organism · CalloutPanel — dark promo panel (e.g. "Get your Fan ID in five minutes"). */
export function CalloutPanel(props: CalloutPanelProps) {
  validateProps("CalloutPanel", calloutPanelPropsSchema, props);
  const { eyebrow, title, body, action, className } = props;
  return (
    <section
      aria-labelledby="callout-title"
      className={cn("flex flex-col justify-center gap-3.5 rounded-xl bg-ink p-7 text-white", className)}
    >
      <Eyebrow tone="gold">{eyebrow}</Eyebrow>
      <Heading id="callout-title" size="2xl">
        {title}
      </Heading>
      <p className="text-base leading-normal text-ash">{body}</p>
      <LinkButton href={action.href} variant="primary" size="xl" className="self-start">
        {action.label}
      </LinkButton>
    </section>
  );
}

/* ---------- FiltersPanel ---------- */

export const eventFiltersSchema = z.object({
  categories: z.array(z.string()),
  cities: z.array(citySchema),
  from: z.string().optional(),
  availableOnly: z.boolean(),
});
export type EventFilters = z.infer<typeof eventFiltersSchema>;

export const filtersPanelPropsSchema = z.object({
  groupLabel: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  cities: z.array(citySchema).min(1),
  value: eventFiltersSchema,
  onChange: zFn<(value: EventFilters) => void>(),
  onClear: zFn<() => void>(),
  className: zClassName,
});

export type FiltersPanelProps = z.input<typeof filtersPanelPropsSchema>;

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** Organism · FiltersPanel — fully controlled browse filters. */
export function FiltersPanel(props: FiltersPanelProps) {
  validateProps("FiltersPanel", filtersPanelPropsSchema, props);
  const { groupLabel, categories, cities, value, onChange, onClear, className } = props;
  const { t } = useI18n();
  const legend = "pb-2 font-mono text-xs text-muted-ink uppercase";
  const option = "flex min-h-8 cursor-pointer items-center gap-2.5 text-sm";
  return (
    <aside aria-label={t("Filters")} className={cn("flex flex-col gap-[18px] rounded-xl border border-line bg-white p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{t("Filters")}</span>
        <button type="button" onClick={onClear} className="min-h-11 text-sm font-semibold text-pitch hover:underline">
          {t("Clear")}
        </button>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={legend}>{groupLabel}</legend>
        {categories.map((category) => (
          <label key={category} className={option}>
            <Checkbox
              checked={value.categories.includes(category)}
              onCheckedChange={() => onChange({ ...value, categories: toggle(value.categories, category) })}
            />
            {t(category)}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={legend}>{t("City")}</legend>
        {cities.map((city) => (
          <label key={city} className={option}>
            <Checkbox
              checked={value.cities.includes(city)}
              onCheckedChange={() => onChange({ ...value, cities: toggle<City>(value.cities, city) })}
            />
            {t(cityLabels[city])}
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={legend}>{t("Date")}</legend>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted-ink">
          {t("From")}
          <Input type="date" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} />
        </label>
      </fieldset>
      <label className={cn(option, "border-t border-line pt-3.5")}>
        <Checkbox checked={value.availableOnly} onCheckedChange={(checked) => onChange({ ...value, availableOnly: checked })} />
        {t("Show available only")}
      </label>
    </aside>
  );
}

/* ---------- EventResults ---------- */

export const eventResultsPropsSchema = z.object({
  status: z.enum(["loading", "error", "success"]),
  events: z.array(eventSummarySchema),
  hrefFor: zFn<(event: EventSummary) => string>(),
  onRetry: zFn<() => void>().optional(),
  emptyAction: zNode.optional(),
  className: zClassName,
});

export type EventResultsProps = z.input<typeof eventResultsPropsSchema>;

/** Organism · EventResults — result count + rows, with loading, error and empty states. */
export function EventResults(props: EventResultsProps) {
  validateProps("EventResults", eventResultsPropsSchema, props);
  const { status, events, hrefFor, onRetry, emptyAction, className } = props;
  const { t } = useI18n();
  return (
    <section aria-label={t("Results")} aria-busy={status === "loading"} className={cn("flex flex-col gap-2.5", className)}>
      <p role="status" className="text-sm text-muted-ink">
        {status === "loading"
          ? t("Loading events…")
          : status === "error"
            ? ""
            : t("{count, plural, one {# upcoming event} other {# upcoming events}}", { count: events.length })}
      </p>
      {status === "loading" ? (
        Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[100px]" rounded="xl" />)
      ) : status === "error" ? (
        <ErrorState message={t("We couldn't load events. Check your connection and try again.")} onRetry={onRetry} />
      ) : events.length === 0 ? (
        <EmptyState title={t("No events match your filters")} action={emptyAction}>
          {t("Try another city or date, or clear the filters.")}
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {events.map((event) => (
            <li key={event.id}>
              <EventRow event={event} href={hrefFor(event)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
