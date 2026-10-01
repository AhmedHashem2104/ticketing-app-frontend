import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { concertSummary, matchSummary } from "../fixtures";
import { Badge, badgeToneValues } from "./Badge";
import { Chip } from "./Chip";
import { Barcode, QRCode } from "./Codes";
import { DateBadge, Money } from "./DataDisplay";
import { ProgressBar, Separator, Skeleton, Spinner } from "./Feedback";
import { Avatar, Logo, TeamCrest } from "./Identity";
import { Seat, Swatch } from "./Seat";
import { Eyebrow, Heading } from "./Typography";

/** Display atoms — typography, identity, status, codes and seats. */
const meta = {
  title: "Atoms/Display",
  component: Badge,
  args: { tone: "warning", children: "Few left" },
  argTypes: { tone: { control: "select", options: badgeToneValues } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusBadge: Story = {};

export const BadgeTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {badgeToneValues.map((tone) => (
        <Badge key={tone} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Eyebrow tone="pitch">Premier League · Matchday 12</Eyebrow>
      <Heading as="h1" size="4xl">
        Nile FC vs Delta SC
      </Heading>
      <Heading as="h2" font="ticket" size="xl">
        Layla Nour Live
      </Heading>
      <Heading as="h3" font="sans" size="xs">
        Your seats
      </Heading>
    </div>
  ),
};

export const Identity: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Logo />
      <Logo wordmark="ticket" />
      <div className="rounded-lg bg-pitch p-3">
        <Logo tone="gold" />
      </div>
      <Avatar initials="OK" size="md" />
      <Avatar initials="YA" label="Youssef A." />
      <div className="flex gap-2 rounded-lg bg-pitch p-3">
        <TeamCrest short="NFC" />
        <TeamCrest short="DSC" variant="dark" />
      </div>
    </div>
  ),
};

export const Feedback: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <ProgressBar value={62} label="Progress in line" />
      <ProgressBar value={40} label="Time until the QR refreshes" tone="gold" size="xs" />
      <Spinner label="Loading events" />
      <Skeleton className="h-16" rounded="xl" />
      <Separator />
    </div>
  ),
};

export const Codes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <QRCode value="https://matchpass.app/t/MP-58213" size={160} />
      <Barcode value="MP-58213" className="w-56" />
    </div>
  ),
};

export const Data: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <DateBadge date={matchSummary.startsAt} />
      <DateBadge date={concertSummary.startsAt} theme="plum" size="sm" />
      <DateBadge date={concertSummary.startsAt} variant="plain" />
      <Money amount={1850} variant="display" className="text-4xl" />
      <Money amount={47.5} variant="mono" />
    </div>
  ),
};

function SeatsDemo() {
  const [selected, setSelected] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Seat state={selected ? "selected" : "available"} number={7} label="Row F seat 7" onToggle={() => setSelected((s) => !s)} />
      <Seat state="taken" number={8} label="Row F seat 8, taken" />
      <Seat state="wheelchair" number={1} label="Row L seat 1, wheelchair space" />
      <Seat state="available" number={3} label="Row A seat 3, Category A" fill="#5A3A8C" edge="#3B1F6B" onFill="#FFFFFF" />
      <Seat state="available" number={2} label="Row J seat 2, VIP recliner" size="lg" wide fill="#0E4D2F" edge="#0E4D2F" onFill="#FFFFFF" />
      <Swatch fill="#E7E4DA" border="dashed" borderColor="#8C8F88" />
    </div>
  );
}
export const Seats: Story = { render: () => <SeatsDemo /> };

function ChipDemo() {
  const [pressed, setPressed] = useState(true);
  return (
    <div className="flex gap-2">
      <Chip pressed={pressed} onPressedChange={setPressed}>
        Concerts
      </Chip>
      <Chip pressed={!pressed} onPressedChange={() => setPressed((p) => !p)} tone="plum" size="sm">
        600 EGP
      </Chip>
    </div>
  );
}
export const Chips: Story = { render: () => <ChipDemo /> };
