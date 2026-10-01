import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { arenaMap, comingSoonSummary, concertSummary, fans, matchDetail, matchSummary } from "../fixtures";
import {
  Card,
  DetailList,
  EmptyState,
  ErrorState,
  FaqList,
  HolderRow,
  Legend,
  ListingRow,
  LoadingState,
  Notice,
  NumberedStep,
  StatTile,
  SummaryRow,
} from "./Content";
import { ComingSoonRow, EventCard, EventRow, FanOption, PickedSeatRow, TicketTypeRow } from "./Events";

const meta = {
  title: "Molecules/Content",
  component: Notice,
  args: { tone: "success", title: "Your Fan ID is approved", children: "2 linked fans ready: Youssef A., Mariam K." },
  argTypes: { tone: { control: "select", options: ["success", "warning", "danger", "info", "neutral"] } },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoticeMessage: Story = {};
export const Warning: Story = {
  args: { tone: "warning", title: "Delta SC vs Red Sea FC has been postponed.", children: "Keep your tickets or get a full refund." },
};

export const PriceSummary: Story = {
  render: () => (
    <Card title="Order" className="max-w-sm">
      <SummaryRow label="Category 1 × 2" amount={500} />
      <SummaryRow label="Service fee × 2" amount={30} />
      <SummaryRow label="Promo MATCHPASS10" amount={-50} />
      <SummaryRow label="Total" amount={480} variant="total" />
    </Card>
  ),
};

export const Faq: Story = { render: () => <FaqList items={matchDetail.faqs} className="max-w-xl" /> };

export const Informational: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <Legend
        items={[
          { label: "Available", swatch: { fill: "#D5E6DA" } },
          { label: "Few left", swatch: { fill: "#FCE8A6" } },
          { label: "Not for sale to you", swatch: { fill: "#E7E4DA", border: "dashed", borderColor: "#8C8F88" } },
        ]}
      />
      <NumberedStep index={1} title="Bring your ID card">
        Gate staff match your face and name with your Fan ID.
      </NumberedStep>
      <DetailList
        items={[
          { label: "Refund to", value: "Matchpass credit" },
          { label: "Arrives", value: "Instantly, once approved" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="People ahead of you" value="1,706" />
        <StatTile label="Estimated wait" value="~3 min" />
      </div>
      <HolderRow initials="OK" name="Omar K." detail="Fan ID •••• 4821" />
      <ListingRow title="Cairo Jazz Nights · 2-day" detail="300 EGP" status="Listed" tone="warning" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <EmptyState title="No events match your filters">Try another city or date.</EmptyState>
      <ErrorState message="We couldn't load events." onRetry={() => {}} />
      <LoadingState label="Loading events" />
    </div>
  ),
};

export const EventCards: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      <EventCard event={matchSummary} href="/events/nile-fc-vs-delta-sc" />
      <EventCard event={concertSummary} href="/events/layla-nour-live-in-cairo" />
    </div>
  ),
};

export const EventRows: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-2.5">
      <EventRow event={matchSummary} href="/events/nile-fc-vs-delta-sc" />
      <EventRow event={concertSummary} href="/events/layla-nour-live-in-cairo" />
    </div>
  ),
};

function PurchaseRowsDemo() {
  const [notified, setNotified] = useState(false);
  const [checked, setChecked] = useState(true);
  const [qty, setQty] = useState(1);
  return (
    <div className="flex max-w-lg flex-col gap-3">
      <ComingSoonRow event={comingSoonSummary} notified={notified} onNotify={() => setNotified(true)} />
      <FanOption fan={fans[0]!} checked={checked} onCheckedChange={setChecked} />
      <FanOption fan={fans[2]!} checked={false} onCheckedChange={() => {}} />
      <TicketTypeRow ticketType={arenaMap.ticketTypes[0]!} quantity={qty} onQuantityChange={setQty} canIncrease={qty < 8} />
      <ul className="m-0 list-none p-0">
        <PickedSeatRow label="Block W2 · Row A · Seat 5" detail="Category 1 · 250 EGP" onRemove={() => {}} showSwatch />
      </ul>
    </div>
  );
}
export const PurchaseRows: Story = { render: () => <PurchaseRowsDemo /> };
