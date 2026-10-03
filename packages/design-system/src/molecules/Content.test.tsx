import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { arenaMap, comingSoonSummary, concertSummary, fans, matchSummary } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
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

describe("Card & SummaryRow", () => {
  it("renders a titled card with summary lines and a total", async () => {
    const { container } = renderUI(
      <Card title="Prices by zone" titleAs="h2">
        <SummaryRow label="Category 1 × 2" amount={500} format="amount" />
        <SummaryRow label="Promo" amount={-50} />
        <SummaryRow label="Credit bonus +5%" amount={90} variant="bonus" />
        <SummaryRow label="Total" amount={530} variant="total" />
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Prices by zone" })).toBeInTheDocument();
    expect(screen.getByText("500.00")).toBeInTheDocument();
    expect(screen.getByText("− 50 EGP")).toBeInTheDocument();
    expect(screen.getByText("+90 EGP")).toBeInTheDocument();
    expect(screen.getByText("530 EGP")).toHaveClass("font-display");
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    // @ts-expect-error invalid variant
    expectInvalidProps(() => renderUI(<SummaryRow label="x" amount={1} variant="big" />), /variant/);
    expectInvalidProps(() => renderUI(<SummaryRow label="x" amount={Infinity} />), /amount/);
  });
});

describe("Notice", () => {
  it("uses status for information and alert for danger", async () => {
    const { container } = renderUI(
      <>
        <Notice tone="success" title="Your Fan ID is approved">
          2 linked fans ready
        </Notice>
        <Notice tone="danger">Payment declined</Notice>
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Your Fan ID is approved");
    expect(screen.getByRole("alert")).toHaveTextContent("Payment declined");
    await expectNoA11yViolations(container);
  });

  it("validates the tone", () => {
    // @ts-expect-error missing tone
    expectInvalidProps(() => renderUI(<Notice>hi</Notice>), /tone/);
  });
});

describe("FaqList", () => {
  it("expands answers on demand", async () => {
    const { user, container } = renderUI(
      <FaqList items={[{ question: "When do I get the QR code?", answer: "24 hours before kick-off." }]} />,
    );
    const trigger = screen.getByRole("button", { name: "When do I get the QR code?" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("24 hours before kick-off.")).toBeVisible();
    await expectNoA11yViolations(container);
  });

  it("requires items", () => {
    expectInvalidProps(() => renderUI(<FaqList items={[]} />), /items/);
  });
});

describe("Legend, NumberedStep, DetailList, StatTile, HolderRow, ListingRow", () => {
  it("renders informational molecules accessibly", async () => {
    const { container } = renderUI(
      <div>
        <Legend
          items={[
            { label: "Available", swatch: { fill: "#D5E6DA" } },
            { label: "Taken", swatch: { fill: "#E7E4DA", mark: "×", shape: "seat" } },
          ]}
        />
        <NumberedStep index={1} title="Bring your ID card">
          Gate staff match your face.
        </NumberedStep>
        <NumberedStep index={2} tone="inverse">
          List your ticket at up to face value.
        </NumberedStep>
        <DetailList
          items={[
            { label: "Tickets", value: "Golden Circle · Ticket 1" },
            { label: "Refund to", value: "Matchpass credit" },
          ]}
        />
        <StatTile label="People ahead of you" value="1,706" />
        <HolderRow initials="OK" name="Omar K." detail="Fan ID •••• 4821" />
        <ListingRow title="Cairo Jazz Nights" detail="300 EGP" status="Listed" tone="warning" />
      </div>,
    );
    expect(screen.getByRole("list", { name: "Map key" })).toHaveTextContent("Available×Taken");
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Refund to").tagName).toBe("DT");
    expect(screen.getByText("1,706")).toBeInTheDocument();
    expect(screen.getByText("Listed")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("validates props", () => {
    expectInvalidProps(() => renderUI(<NumberedStep index={0}>x</NumberedStep>), /index/);
    expectInvalidProps(() => renderUI(<StatTile label="x" value="" />), /value/);
    // @ts-expect-error invalid tone
    expectInvalidProps(() => renderUI(<ListingRow title="x" status="y" tone="blue" />), /tone/);
  });
});

describe("status states", () => {
  it("renders empty, error and loading states", async () => {
    const onRetry = vi.fn();
    const { user, container } = renderUI(
      <div>
        <EmptyState title="No events match your filters">Try clearing a filter.</EmptyState>
        <ErrorState message="We couldn't load events." onRetry={onRetry} />
        <LoadingState label="Loading events" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Loading events");
    await expectNoA11yViolations(container);
  });
});

describe("event molecules", () => {
  it("renders an event card link with price and status", async () => {
    const { container } = renderUI(<EventCard event={concertSummary} href="/events/layla-nour-live-in-cairo" />);
    const link = screen.getByRole("link", { name: /Layla Nour — Live in Cairo/ });
    expect(link).toHaveAttribute("href", "/events/layla-nour-live-in-cairo");
    expect(link).toHaveTextContent("From 450 EGP");
    expect(link).toHaveTextContent("Few left");
    expect(link).toHaveTextContent("Concert");
    await expectNoA11yViolations(container);
  });

  it("renders an event row", () => {
    renderUI(<EventRow event={matchSummary} href="/events/nile-fc-vs-delta-sc" />);
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("Premier League · Matchday 12");
    expect(link).toHaveTextContent("Sun 20:00 · Capital Stadium, Cairo");
    expect(link).toHaveTextContent("18OCT");
  });

  it("notifies for coming soon events", async () => {
    const onNotify = vi.fn();
    const { user, rerender } = renderUI(<ComingSoonRow event={comingSoonSummary} notified={false} onNotify={onNotify} />);
    await user.click(screen.getByRole("button", { name: "Notify me about Egypt vs Morocco" }));
    expect(onNotify).toHaveBeenCalled();
    rerender(<ComingSoonRow event={comingSoonSummary} notified onNotify={onNotify} />);
    expect(screen.getByRole("button", { name: /We'll notify you/ })).toBeDisabled();
  });

  it("lets approved fans be chosen but blocks fans under review", async () => {
    const onChange = vi.fn();
    const { user, container } = renderUI(
      <div>
        <FanOption fan={fans[1]!} checked={false} onCheckedChange={onChange} />
        <FanOption fan={fans[2]!} checked onCheckedChange={onChange} />
      </div>,
    );
    await user.click(screen.getByText("Youssef A."));
    expect(onChange).toHaveBeenCalledWith(true);
    const blocked = screen.getByRole("checkbox", { name: "Hassan M." });
    expect(blocked).toBeDisabled();
    expect(blocked).not.toBeChecked();
    expect(blocked).toHaveAccessibleDescription("Fan ID under review — can’t buy yet");
    await expectNoA11yViolations(container);
  });

  it("changes ticket type quantities", async () => {
    const onChange = vi.fn();
    const { user } = renderUI(
      <TicketTypeRow ticketType={arenaMap.ticketTypes[0]!} quantity={1} onQuantityChange={onChange} canIncrease={false} />,
    );
    expect(screen.getByRole("button", { name: "One more Golden Circle" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "One less Golden Circle" }));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(screen.getByText("Few left")).toBeInTheDocument();
  });

  it("removes picked seats", async () => {
    const onRemove = vi.fn();
    const { user, container } = renderUI(
      <ul>
        <PickedSeatRow label="Block W2 · Row A · Seat 5" detail="Category 1 · 250 EGP" onRemove={onRemove} showSwatch />
      </ul>,
    );
    await user.click(screen.getByRole("button", { name: "Remove Block W2 · Row A · Seat 5" }));
    expect(onRemove).toHaveBeenCalled();
    await expectNoA11yViolations(container);
  });

  it("validates event props against the API contract", () => {
    expectInvalidProps(() => renderUI(<EventCard event={{ ...matchSummary, priceFrom: -1 }} href="/x" />), /priceFrom/);
    // @ts-expect-error bad status
    expectInvalidProps(() => renderUI(<EventRow event={{ ...matchSummary, status: "open" }} href="/x" />), /status/);
  });
});
