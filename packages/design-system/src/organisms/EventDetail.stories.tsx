import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { concertDetail, matchDetail, queueInLine, queueTurn, queueWaiting } from "../fixtures";
import {
  ConcertHero,
  EventBanner,
  EventContextBar,
  GatesCard,
  ListCard,
  MatchHero,
  PriceTable,
  PromoterCard,
  RunningOrder,
  SaleCountdownCard,
  TicketsFromCard,
} from "./EventDetail";
import { WaitingRoomPanel } from "./Queue";

const meta = {
  title: "Organisms/Event detail",
  component: MatchHero,
  parameters: { layout: "fullscreen" },
  args: { event: matchDetail, breadcrumbs: [{ label: "Matches", href: "/events" }, { label: "Premier League" }, { label: "Matchday 12" }] },
} satisfies Meta<typeof MatchHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MatchHeader: Story = {};

export const ConcertHeader: Story = {
  render: () => <ConcertHero event={concertDetail} breadcrumbs={[{ label: "Concerts & events", href: "/events" }, { label: "Pop" }]} />,
};

export const Banners: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <EventBanner
        eyebrow="CLASSICAL · ONE NIGHT"
        title="Nile Philharmonic: Film Classics"
        meta="Sat 6 Dec · 20:00 · Opera Hall, Cairo"
        theme="violet"
      />
      <EventBanner eyebrow="DRAMA · 2H 08M" title="The Last Lighthouse" meta="Matchpass Cinemas · Screen 4" theme="ink" poster />
      <EventContextBar
        title="Nile FC vs Delta SC"
        meta="Sun 18 Oct · 20:00 · Capital Stadium"
        step={1}
        expiresAt={new Date(Date.UTC(2099, 0, 1)).toISOString()}
      />
    </div>
  ),
};

export const Content: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <PriceTable title="Prices by zone" rows={matchDetail.priceTable} note={matchDetail.priceNote} />
      <GatesCard gates={matchDetail.gates!} note={matchDetail.gatesNote} />
      <ListCard title="Before you buy" items={matchDetail.rules} />
      <RunningOrder items={concertDetail.runningOrder!} />
      <PromoterCard name="Nile Live Productions" verified />
    </div>
  ),
};

function BuyBoxesDemo() {
  const [reminded, setReminded] = useState(false);
  const [applied, setApplied] = useState<string>();
  const [saleOpensAt] = useState(() => new Date(Date.now() + (2 * 24 + 4) * 3_600_000).toISOString());
  return (
    <div className="flex flex-wrap items-start gap-6">
      <SaleCountdownCard
        className="w-[380px]"
        saleOpensAt={saleOpensAt}
        priceFrom={75}
        action={{ label: "Join the waiting room", href: "/q" }}
        reminder={{ active: reminded, onSet: () => setReminded(true) }}
        onAddToCalendar={() => {}}
      />
      <TicketsFromCard
        className="w-[380px]"
        priceFrom={450}
        scarcityNote="Golden Circle: few left"
        action={{ label: "Get tickets", href: "/t" }}
        presale={{ onApply: (code) => setApplied(code), appliedCode: applied }}
        footnote="Max 8 tickets per order · 25 EGP service fee per ticket"
      />
    </div>
  );
}
export const BuyBoxes: Story = { parameters: { layout: "padded" }, render: () => <BuyBoxesDemo /> };

const queueProps = {
  chooseHref: "/tickets",
  maskedPhone: "+20 10•• ••• 482",
  onSmsChange: () => {},
  readyNote: "Your Fan ID and 2 linked fans are ready.",
};
const room = { layout: "padded", backgrounds: { value: "pitch" } };

export const WaitingRoomBeforeSale: Story = {
  parameters: room,
  render: () => <WaitingRoomPanel status={queueWaiting} {...queueProps} className="max-w-[680px]" />,
};
export const WaitingRoomInLine: Story = {
  parameters: room,
  render: () => <WaitingRoomPanel status={queueInLine} {...queueProps} className="max-w-[680px]" />,
};
export const WaitingRoomYourTurn: Story = {
  parameters: room,
  render: () => <WaitingRoomPanel status={queueTurn} {...queueProps} className="max-w-[680px]" />,
};
