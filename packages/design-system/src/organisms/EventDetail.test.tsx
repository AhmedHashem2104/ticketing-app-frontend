import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { concertDetail, matchDetail, queueInLine, queueTurn, queueWaiting } from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
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

const crumbs = [{ label: "Matches", href: "/events" }, { label: "Premier League" }];

describe("heroes", () => {
  it("renders the match hero with an accessible title and entry badges", async () => {
    const { container } = renderUI(<MatchHero event={matchDetail} breadcrumbs={crumbs} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Nile FC vs Delta SC:");
    expect(screen.getByRole("list", { name: "Entry rules" })).toHaveTextContent("Fan ID required");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Matches/Premier League");
    await expectNoA11yViolations(container);
  });

  it("refuses match events without teams", () => {
    expectInvalidProps(() => renderUI(<MatchHero event={{ ...matchDetail, homeTeam: undefined }} breadcrumbs={crumbs} />), /home and away/);
  });

  it("renders the concert hero with facts", async () => {
    const { container } = renderUI(
      <ConcertHero event={concertDetail} breadcrumbs={[{ label: "Concerts & events", href: "/events" }, { label: "Pop" }]} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Layla Nour — Live in Cairo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /poster/ })).toBeInTheDocument();
    expect(screen.getByText("VENUE")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders a banner and a context bar with timer and steps", () => {
    const now = new Date("2026-10-01T10:00:00+03:00").getTime();
    renderUI(
      <>
        <EventBanner
          eyebrow="CLASSICAL"
          title="Film Classics"
          meta="Sat 6 Dec · Opera Hall"
          theme="violet"
          poster
          trailing={<span>timer</span>}
        />
        <EventContextBar
          title="Nile FC vs Delta SC"
          meta="Sun 18 Oct"
          step={1}
          expiresAt="2026-10-01T10:09:42+03:00"
          back={{ label: "Back", href: "/" }}
        />
      </>,
      { now: () => now },
    );
    expect(screen.getByRole("heading", { name: "Film Classics" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("09:42");
    expect(screen.getByRole("list", { name: "Checkout progress" })).toBeInTheDocument();
  });
});

describe("content cards", () => {
  it("renders the price table as a data table", async () => {
    const { container } = renderUI(<PriceTable title="Prices by zone" rows={matchDetail.priceTable} note={matchDetail.priceNote} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "VIP lounge" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "AVAILABILITY" })).toBeInTheDocument();
    expect(screen.getByText("600 EGP")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("renders ticket types without an availability column", () => {
    renderUI(<PriceTable title="Ticket types" rows={concertDetail.priceTable} variant="types" />);
    expect(screen.queryByRole("columnheader", { name: "AVAILABILITY" })).not.toBeInTheDocument();
  });

  it("renders gates, rules, running order and promoter", async () => {
    const { container } = renderUI(
      <div>
        <GatesCard gates={matchDetail.gates!} note="Parking opens early." />
        <ListCard title="Before you buy" items={matchDetail.rules} />
        <RunningOrder items={concertDetail.runningOrder!} />
        <PromoterCard name="Nile Live" verified />
      </div>,
    );
    expect(screen.getByText("Gates 1–4").tagName).toBe("DT");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(2);
    expect(screen.getByText("Verified organiser")).toBeInTheDocument();
    await expectNoA11yViolations(container);
    expectInvalidProps(() => renderUI(<ListCard title="x" items={[]} />), /items/);
  });
});

describe("SaleCountdownCard", () => {
  it("shows the countdown, CTA and reminder actions", async () => {
    const onSet = vi.fn();
    const onCal = vi.fn();
    const { user, rerender } = renderUI(
      <SaleCountdownCard
        saleOpensAt="2026-10-03T14:12:36Z"
        priceFrom={75}
        action={{ label: "Join the waiting room", href: "/q" }}
        reminder={{ active: false, onSet }}
        onAddToCalendar={onCal}
      />,
      { now: () => new Date("2026-10-01T10:00:00Z").getTime() },
    );
    expect(screen.getByRole("timer")).toHaveAccessibleName(/2 days 4 hours 12 minutes/);
    await user.click(screen.getByRole("button", { name: "Set reminder" }));
    await user.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(onSet).toHaveBeenCalled();
    expect(onCal).toHaveBeenCalled();
    rerender(<SaleCountdownCard priceFrom={75} action={{ label: "Join", href: "/q" }} reminder={{ active: true, onSet }} />);
    expect(screen.getByRole("button", { name: /Reminder set/ })).toBeDisabled();
  });
});

describe("TicketsFromCard presale form", () => {
  it("validates the code with zod before calling onApply", async () => {
    const onApply = vi.fn();
    const { user, container } = renderUI(
      <TicketsFromCard
        priceFrom={450}
        scarcityNote="Golden Circle: few left"
        action={{ label: "Get tickets", href: "/t" }}
        presale={{ onApply }}
      />,
    );
    await user.type(screen.getByLabelText("Have a presale code?"), "!!");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Codes are 4–16 letters or numbers");
    expect(onApply).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Have a presale code?"));
    await user.type(screen.getByLabelText("Have a presale code?"), "layla24");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("LAYLA24");
    await expectNoA11yViolations(container);
  });

  it("shows server results", () => {
    const { rerender } = renderUI(
      <TicketsFromCard
        priceFrom={450}
        action={{ label: "Get tickets", href: "/t" }}
        presale={{ onApply: () => {}, error: "That presale code isn't valid" }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("isn't valid");
    rerender(
      <TicketsFromCard
        priceFrom={450}
        action={{ label: "Get tickets", href: "/t" }}
        presale={{ onApply: () => {}, appliedCode: "LAYLA24" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Presale unlocked with LAYLA24");
  });
});

describe("WaitingRoomPanel", () => {
  const props = {
    chooseHref: "/events/x/tickets",
    maskedPhone: "+20 10•• ••• 482",
    onSmsChange: vi.fn(),
    readyNote: "Your Fan ID and 2 linked fans are ready.",
  };

  it("walks through waiting, in line and your turn", async () => {
    const { rerender, user, container } = renderUI(<WaitingRoomPanel status={queueWaiting} {...props} />);
    expect(screen.getByRole("heading", { name: /Sale opens soon/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Opens in 6 seconds")).toHaveTextContent("00:06");
    rerender(<WaitingRoomPanel status={queueInLine} {...props} />);
    expect(screen.getByText("1,706")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progress in line" })).toHaveAttribute("aria-valuenow", "50");
    await user.click(screen.getByRole("checkbox", { name: /Text me at/ }));
    expect(props.onSmsChange).toHaveBeenCalledWith(true);
    await expectNoA11yViolations(container);
    rerender(<WaitingRoomPanel status={queueTurn} {...props} />);
    expect(screen.getByRole("link", { name: "Choose tickets" })).toHaveAttribute("href", "/events/x/tickets");
    expect(screen.getByText("You have 10 minutes to choose your zone and pay.")).toBeInTheDocument();
  });

  it("validates the queue status against the contract", () => {
    expectInvalidProps(() => renderUI(<WaitingRoomPanel status={{ ...queueInLine, progress: 140 }} {...props} />), /progress/);
  });
});
