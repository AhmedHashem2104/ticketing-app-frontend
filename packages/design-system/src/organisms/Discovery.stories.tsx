import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { comingSoonSummary, concertDetail, concertSummary, matchDetail, matchSummary } from "../fixtures";
import { CalloutPanel, ComingSoonList, EventGrid, EventResults, FeaturedEventCard, FiltersPanel, type EventFilters } from "./Discovery";
import { MinimalHeader, SiteFooter, SiteHeader } from "./Header";

const links = [
  { id: "matches", label: "Matches", href: "/events?tab=matches" },
  { id: "concerts", label: "Concerts & events", href: "/events?tab=concerts" },
  { id: "cinema", label: "Cinema", href: "/cinema" },
  { id: "resale", label: "Resale", href: "/resale" },
  { id: "tickets", label: "My tickets", href: "/tickets" },
];

const meta = {
  title: "Organisms/Discovery",
  component: SiteHeader,
  parameters: { layout: "fullscreen" },
  args: {
    links,
    activeId: "matches",
    account: { status: "signed_out", signInHref: "/login", cta: { label: "Get your Fan ID", href: "/signup" } },
  },
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderSignedOut: Story = {};
export const HeaderSignedIn: Story = {
  args: { activeId: "tickets", account: { status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/tickets" } },
};
export const HeaderWithLanguage: Story = { args: { languageToggle: { label: "Switch to Arabic", glyph: "ع", onToggle: () => {} } } };

export const Minimal: Story = {
  render: () => (
    <div className="bg-pitch">
      <MinimalHeader tone="dark" trailing={<span className="text-sm text-mint">Official waiting room</span>} />
    </div>
  ),
};

export const Footer: Story = {
  render: () => (
    <SiteFooter
      className="mt-0"
      tagline="Official tickets for football, concerts and live events."
      columns={[
        {
          title: "Fans",
          links: [
            { label: "Matches", href: "/events" },
            { label: "Official resale", href: "/resale" },
          ],
        },
        { title: "Help & legal", links: [{ label: "Help centre", href: "/info/help" }] },
      ]}
    />
  ),
};

export const Featured: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
      <FeaturedEventCard
        event={matchDetail}
        primaryAction={{ label: "Join the waiting room", href: "/q" }}
        secondaryAction={{ label: "Match details", href: "/m" }}
      />
      <FeaturedEventCard
        event={concertDetail}
        primaryAction={{ label: "Get tickets", href: "/t" }}
        secondaryAction={{ label: "Lineup & info", href: "/i" }}
      />
    </div>
  ),
};

export const Grid: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <EventGrid
      title="On sale now"
      events={[matchSummary, concertSummary]}
      hrefFor={(e) => `/events/${e.slug}`}
      seeAll={{ label: "See all events", href: "/events" }}
    />
  ),
};

function ComingSoonDemo() {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-5">
      <ComingSoonList events={[comingSoonSummary]} notifiedIds={ids} onNotify={(e) => setIds((x) => [...x, e.id])} />
      <CalloutPanel
        eyebrow="Needed for football matches"
        title="Get your Fan ID in five minutes"
        body="Scan your national ID or passport and take a selfie."
        action={{ label: "Start verification", href: "/fan-id" }}
      />
    </div>
  );
}
export const ComingSoonAndCallout: Story = { parameters: { layout: "padded" }, render: () => <ComingSoonDemo /> };

function BrowseDemo() {
  const [filters, setFilters] = useState<EventFilters>({ categories: [], cities: [], availableOnly: false });
  return (
    <div className="flex flex-wrap items-start gap-6">
      <FiltersPanel
        className="w-[260px]"
        groupLabel="COMPETITION"
        categories={["Premier League", "Cup", "National team"]}
        cities={["cairo", "alexandria", "canal"]}
        value={filters}
        onChange={setFilters}
        onClear={() => setFilters({ categories: [], cities: [], availableOnly: false })}
      />
      <EventResults
        className="min-w-[320px] flex-1"
        status="success"
        events={[matchSummary, comingSoonSummary]}
        hrefFor={(e) => `/events/${e.slug}`}
      />
    </div>
  );
}
export const Browse: Story = { parameters: { layout: "padded" }, render: () => <BrowseDemo /> };

export const BrowseLoading: Story = {
  parameters: { layout: "padded" },
  render: () => <EventResults status="loading" events={[]} hrefFor={() => "/"} />,
};
