import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CheckoutSteps, ChipGroup, SegmentedControl, SegmentedNav, StepProgress } from "./Navigation";
import { CountdownTiles, HoldTimer } from "./Time";

const meta = {
  title: "Molecules/Navigation & time",
  component: StepProgress,
  args: { steps: ["Document", "ID photos", "Selfie", "Review", "Done"], current: 2 },
} satisfies Meta<typeof StepProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Steps: Story = {};

export const Checkout: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <CheckoutSteps current={1} />
      <CheckoutSteps current={2} accent="plum" />
      <CheckoutSteps current={3} />
    </div>
  ),
};

function SegmentedDemo() {
  const [value, setValue] = useState("matches");
  return (
    <SegmentedControl
      label="Event type"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "matches", label: "Matches" },
        { value: "concerts", label: "Concerts & events" },
      ]}
    />
  );
}
export const Segmented: Story = { render: () => <SegmentedDemo /> };

export const PageTabs: Story = {
  render: () => (
    <SegmentedNav
      label="Ticket lists"
      items={[
        { href: "/tickets", label: "Upcoming (3)", current: true },
        { href: "/tickets?scope=past", label: "Past" },
        { href: "/refunds", label: "Refunds (3)" },
      ]}
    />
  ),
};

function ChipsDemo() {
  const [value, setValue] = useState("All");
  return (
    <ChipGroup
      label="Categories"
      value={value}
      onValueChange={setValue}
      options={["All", "Premier League", "Cup", "National team", "Concerts", "Festivals"].map((v) => ({ value: v, label: v }))}
    />
  );
}
export const Chips: Story = { render: () => <ChipsDemo /> };

function TimersDemo() {
  const [targets] = useState(() => ({
    hold: new Date(Date.now() + 582_000).toISOString(),
    sale: new Date(Date.now() + (2 * 24 + 4) * 3_600_000).toISOString(),
  }));
  return (
    <div className="flex flex-col gap-4">
      <HoldTimer expiresAt={targets.hold} className="self-start" />
      <CountdownTiles target={targets.sale} className="max-w-sm" />
    </div>
  );
}
export const Timers: Story = { render: () => <TimersDemo /> };
