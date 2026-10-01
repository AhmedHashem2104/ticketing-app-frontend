import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { arenaMap, cinemaMap, cinemaSeats, fans, hallMap, stadiumMap } from "../fixtures";
import { cinemaSeatGroups, hallSeatGroups, stadiumSeatGroups, toggleSeat } from "../lib/seating";
import {
  ArenaMap,
  FanSelector,
  OrderSummaryCard,
  PickedSeatsPanel,
  SeatMap,
  ShowtimePicker,
  StadiumBlockMap,
  TicketTypePicker,
  TierPriceList,
  ZonePicker,
  ZoneSummaryCard,
} from "./Seating";

const meta = {
  title: "Organisms/Seating",
  component: ZonePicker,
  args: { zones: stadiumMap.zones, value: "cat1", onValueChange: () => {} },
} satisfies Meta<typeof ZonePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function ZonesDemo() {
  const [zone, setZone] = useState("cat1");
  const [fanIds, setFanIds] = useState(["fan_omar"]);
  const current = stadiumMap.zones.find((z) => z.id === zone)!;
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ZonePicker zones={stadiumMap.zones} value={zone} onValueChange={setZone} exactSeatsHref="/seats" className="max-w-[620px] flex-1" />
      <div className="flex w-[380px] flex-col gap-4">
        <ZoneSummaryCard zone={current} />
        <FanSelector fans={fans} value={fanIds} onValueChange={setFanIds} max={4} linkFanHref="/fan-id" />
        <OrderSummaryCard
          lines={[
            { label: `${current.short} × ${fanIds.length}`, amount: current.price * fanIds.length },
            { label: `Service fee × ${fanIds.length}`, amount: 15 * fanIds.length },
          ]}
          total={(current.price + 15) * fanIds.length}
          cta={{ label: "Continue to payment", onClick: () => {}, disabled: fanIds.length === 0 }}
        />
      </div>
    </div>
  );
}
export const ZoneAndFans: Story = { render: () => <ZonesDemo /> };

function StadiumDemo() {
  const [blockId, setBlockId] = useState("W2");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const block = stadiumMap.blocks.find((b) => b.id === blockId)!;
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex max-w-[640px] flex-1 flex-col gap-4">
        <StadiumBlockMap blocks={stadiumMap.blocks} value={blockId} onValueChange={setBlockId} />
        <SeatMap
          label={`Block ${blockId} seats`}
          groups={stadiumSeatGroups(block, selected)}
          onToggle={(id) => {
            const next = toggleSeat(selected, id, 4, "You can pick up to 4 seats — one for each Fan ID on your order.");
            setSelected(next.selected);
            setMessage(next.message);
          }}
        />
      </div>
      <PickedSeatsPanel
        className="w-[380px]"
        title="Your seats"
        countLabel={`${selected.length} of 4 · one per Fan ID`}
        emptyText="No seats yet. Choose a block on the map, then tap green seats."
        seats={selected.map((id) => ({ id, label: id, detail: `${block.category} · ${block.price} EGP` }))}
        onRemove={(id) => setSelected((s) => s.filter((x) => x !== id))}
        message={message}
        fees={15 * selected.length}
        total={(block.price + 15) * selected.length}
        showSwatch
        cta={{ label: "Continue", onClick: () => {}, disabled: selected.length === 0 }}
      />
    </div>
  );
}
export const StadiumSeats: Story = { render: () => <StadiumDemo /> };

function ArenaDemo() {
  const [focus, setFocus] = useState("gc");
  const [qty, setQty] = useState<Record<string, number>>({ gc: 2 });
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ArenaMap
        ticketTypes={arenaMap.ticketTypes}
        focusedId={focus}
        onFocusChange={setFocus}
        note={arenaMap.note}
        className="max-w-[620px] flex-1"
      />
      <TicketTypePicker
        ticketTypes={arenaMap.ticketTypes}
        quantities={qty}
        onQuantitiesChange={setQty}
        max={8}
        focusedId={focus}
        onFocusChange={setFocus}
        className="w-[420px]"
      />
    </div>
  );
}
export const ArenaTicketTypes: Story = { render: () => <ArenaDemo /> };

function HallDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <SeatMap
        label="Concert hall seats"
        size="sm"
        groups={hallSeatGroups(hallMap, selected, "all")}
        onToggle={(id) => setSelected(toggleSeat(selected, id, 8, "Up to 8").selected)}
      />
      <TierPriceList tiers={hallMap.tiers} className="w-[380px]" />
    </div>
  );
}
export const ConcertHall: Story = { render: () => <HallDemo /> };

function CinemaDemo() {
  const [showtimeId, setShowtimeId] = useState("st_0_2");
  const [selected, setSelected] = useState<string[]>([]);
  const showtime = cinemaMap.showtimes.find((s) => s.id === showtimeId)!;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <ShowtimePicker showtimes={cinemaMap.showtimes} value={showtimeId} onValueChange={setShowtimeId} />
      <SeatMap
        label="Cinema seats"
        size="lg"
        groups={cinemaSeatGroups(cinemaSeats, showtime, selected)}
        onToggle={(id) => setSelected(toggleSeat(selected, id, 10, "Up to 10").selected)}
      />
    </div>
  );
}
export const Cinema: Story = { render: () => <CinemaDemo /> };
