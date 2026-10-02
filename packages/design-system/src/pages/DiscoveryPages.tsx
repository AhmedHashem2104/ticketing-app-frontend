import { citySchema, eventDetailSchema, eventSummarySchema, eventTabSchema, type EventSummary, type EventTab } from "@repo/contracts";
import { z } from "zod";
import { Button } from "../atoms/Button";
import { Heading } from "../atoms/Typography";
import { Notice } from "../molecules/Content";
import { SearchField } from "../molecules/Form";
import { ChipGroup, SegmentedControl } from "../molecules/Navigation";
import {
  CalloutPanel,
  ComingSoonList,
  EventGrid,
  EventResults,
  eventFiltersSchema,
  FeaturedEventCard,
  FiltersPanel,
  type EventFilters,
} from "../organisms/Discovery";
import {
  ConcertHero,
  GatesCard,
  ListCard,
  MatchHero,
  PriceTable,
  PromoterCard,
  RunningOrder,
  SaleCountdownCard,
  TicketsFromCard,
  ticketsFromCardPropsSchema,
  saleCountdownCardPropsSchema,
} from "../organisms/EventDetail";
import { Container, SiteLayout, TwoColumn } from "../templates/Layouts";
import { FaqList, Card } from "../molecules/Content";
import { validateProps, zFn, zHref, zNode } from "../lib/props";

const actionSchema = z.object({ label: z.string().min(1), href: zHref });
const crumbSchema = z.object({ label: z.string().min(1), href: zHref.optional() });

/* ---------- HomePage ---------- */

export const homePagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  featured: z.array(z.object({ event: eventDetailSchema, primaryAction: actionSchema, secondaryAction: actionSchema })),
  categories: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
  onCategoryChange: zFn<(category: string) => void>(),
  onSale: z.array(eventSummarySchema),
  hrefFor: zFn<(event: EventSummary) => string>(),
  comingSoon: z.object({
    events: z.array(eventSummarySchema),
    notifiedIds: z.array(z.string()),
    pendingId: z.string().optional(),
    onNotify: zFn<(event: EventSummary) => void>().optional(),
  }),
  callout: z.object({ eyebrow: z.string(), title: z.string(), body: z.string(), action: actionSchema }).optional(),
  notice: z.string().optional(),
});

export type HomePageProps = z.input<typeof homePagePropsSchema>;

/** Page · Home — featured events, category chips, on-sale grid, coming soon and the Fan ID callout. */
export function HomePage(props: HomePageProps) {
  validateProps("HomePage", homePagePropsSchema, props);
  const { header, footer, featured, categories, category, onCategoryChange, onSale, hrefFor, comingSoon, callout, notice } = props;
  return (
    <SiteLayout header={header} footer={footer}>
      <Container className="flex flex-col gap-10 pt-8">
        <h1 className="sr-only">Matchpass — official tickets for football, concerts and live events</h1>
        {notice ? <Notice tone="warning">{notice}</Notice> : null}
        {featured.length ? (
          <section aria-label="Featured" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-5">
            {featured.map((f) => (
              <FeaturedEventCard key={f.event.id} {...f} />
            ))}
          </section>
        ) : null}
        <ChipGroup
          label="Categories"
          options={categories.map((c) => ({ value: c, label: c }))}
          value={category}
          onValueChange={onCategoryChange}
        />
        <EventGrid
          title="On sale now"
          events={onSale}
          hrefFor={hrefFor}
          seeAll={{ label: "See all events", href: "/events" }}
          emptyText={`Nothing on sale in ${category} right now.`}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-5">
          {comingSoon.events.length ? <ComingSoonList {...comingSoon} /> : null}
          {callout ? <CalloutPanel {...callout} /> : null}
        </div>
      </Container>
    </SiteLayout>
  );
}

/* ---------- EventsPage ---------- */

export const eventsPagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  tab: eventTabSchema,
  onTabChange: zFn<(tab: EventTab) => void>(),
  /** Adds the Cinema tab (films and showtimes). */
  showCinema: z.boolean().optional(),
  search: z.string(),
  onSearchChange: zFn<(value: string) => void>(),
  filters: eventFiltersSchema,
  onFiltersChange: zFn<(filters: EventFilters) => void>(),
  onClearFilters: zFn<() => void>(),
  facets: z.object({ categories: z.array(z.string().min(1)).min(1), cities: z.array(citySchema).min(1) }),
  results: z.object({
    status: z.enum(["loading", "error", "success"]),
    events: z.array(eventSummarySchema),
    onRetry: zFn<() => void>().optional(),
  }),
  hrefFor: zFn<(event: EventSummary) => string>(),
});

export type EventsPageProps = z.input<typeof eventsPagePropsSchema>;

/** Page · Browse matches & concerts — tabs, search, filters and results. */
export function EventsPage(props: EventsPageProps) {
  validateProps("EventsPage", eventsPagePropsSchema, props);
  const {
    header,
    footer,
    tab,
    onTabChange,
    showCinema,
    search,
    onSearchChange,
    filters,
    onFiltersChange,
    onClearFilters,
    facets,
    results,
    hrefFor,
  } = props;
  const isMatches = tab === "matches";
  const title = { matches: "Matches", concerts: "Concerts & events", cinema: "Cinema" }[tab];
  return (
    <SiteLayout header={header} footer={footer}>
      <Container className="flex flex-col gap-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3.5">
            <Heading as="h1" size="3xl">
              {title}
            </Heading>
            <SegmentedControl
              label="Event type"
              value={tab}
              onValueChange={(v) => onTabChange(v as EventTab)}
              options={[
                { value: "matches", label: "Matches" },
                { value: "concerts", label: "Concerts & events" },
                ...(showCinema ? [{ value: "cinema", label: "Cinema" }] : []),
              ]}
            />
          </div>
          <SearchField
            label="Search events"
            value={search}
            onValueChange={onSearchChange}
            placeholder={isMatches ? "Search teams, stadiums" : tab === "cinema" ? "Search films" : "Search artists, venues"}
            className="w-full sm:w-[380px]"
          />
        </div>
        <div className="flex flex-wrap items-start gap-6">
          <FiltersPanel
            groupLabel={isMatches ? "COMPETITION" : tab === "cinema" ? "GENRE" : "CATEGORY"}
            categories={facets.categories}
            cities={facets.cities}
            value={filters}
            onChange={onFiltersChange}
            onClear={onClearFilters}
            className="w-full md:w-[260px] md:flex-[0_0_260px]"
          />
          <EventResults
            {...results}
            hrefFor={hrefFor}
            className="min-w-[min(100%,320px)] flex-[1_1_560px]"
            emptyAction={
              <Button variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      </Container>
    </SiteLayout>
  );
}

/* ---------- MatchDetailPage ---------- */

export const matchDetailPagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  event: eventDetailSchema,
  breadcrumbs: z.array(crumbSchema).min(1),
  buyBox: saleCountdownCardPropsSchema.omit({ className: true }),
  fanIdNotice: z
    .object({ tone: z.enum(["success", "warning"]), title: z.string().min(1), body: z.string().optional(), action: zNode.optional() })
    .optional(),
});

export type MatchDetailPageProps = z.input<typeof matchDetailPagePropsSchema>;

/** Page · Match detail — hero, prices, gates, rules, FAQ and the sale countdown box. */
export function MatchDetailPage(props: MatchDetailPageProps) {
  validateProps("MatchDetailPage", matchDetailPagePropsSchema, props);
  const { header, footer, event, breadcrumbs, buyBox, fanIdNotice } = props;
  return (
    <SiteLayout header={header} footer={footer}>
      <MatchHero event={event} breadcrumbs={breadcrumbs} />
      <Container className="pt-8">
        <TwoColumn
          asideLabel="Buy tickets"
          asideWidth="sm"
          aside={
            <>
              <SaleCountdownCard {...buyBox} />
              {fanIdNotice ? (
                <Notice tone={fanIdNotice.tone} title={fanIdNotice.title} action={fanIdNotice.action}>
                  {fanIdNotice.body}
                </Notice>
              ) : null}
            </>
          }
        >
          <PriceTable title="Prices by zone" rows={event.priceTable} note={event.priceNote} />
          {event.gates ? <GatesCard gates={event.gates} note={event.gatesNote} /> : null}
          <ListCard title={event.rulesTitle} items={event.rules} />
          <section aria-labelledby="faq-title" className="flex flex-col gap-2">
            <Heading id="faq-title" size="lg" className="pb-1">
              FAQ
            </Heading>
            <FaqList items={event.faqs} />
          </section>
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}

/* ---------- ConcertDetailPage ---------- */

export const concertDetailPagePropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  event: eventDetailSchema,
  breadcrumbs: z.array(crumbSchema).min(1),
  buyBox: ticketsFromCardPropsSchema.omit({ className: true }),
});

export type ConcertDetailPageProps = z.input<typeof concertDetailPagePropsSchema>;

/** Page · Concert / show detail — hero, about, running order, ticket types and the buy box. */
export function ConcertDetailPage(props: ConcertDetailPageProps) {
  validateProps("ConcertDetailPage", concertDetailPagePropsSchema, props);
  const { header, footer, event, breadcrumbs, buyBox } = props;
  return (
    <SiteLayout header={header} footer={footer}>
      <ConcertHero event={event} breadcrumbs={breadcrumbs} />
      <Container className="pt-8">
        <TwoColumn
          asideLabel="Buy tickets"
          asideWidth="sm"
          aside={
            <>
              <TicketsFromCard {...buyBox} />
              {event.promoter ? <PromoterCard name={event.promoter} verified /> : null}
            </>
          }
        >
          <Card title="About the show">
            <p className="text-base leading-relaxed text-sub">{event.description}</p>
          </Card>
          {event.runningOrder ? <RunningOrder items={event.runningOrder} /> : null}
          <PriceTable title="Ticket types" rows={event.priceTable} variant="types" />
          <ListCard title={event.rulesTitle} items={event.rules} />
          <FaqList items={event.faqs} />
        </TwoColumn>
      </Container>
    </SiteLayout>
  );
}
