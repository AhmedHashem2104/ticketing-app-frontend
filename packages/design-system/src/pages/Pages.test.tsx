import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  arenaMap,
  cinemaMap,
  cinemaSeats,
  comingSoonSummary,
  concertDetail,
  concertSummary,
  concertTicket,
  fans,
  hallMap,
  hold,
  listings,
  matchDetail,
  matchSummary,
  matchTicket,
  matchTicket2,
  order,
  queueInLine,
  refundDone,
  refundInReview,
  refundOptions,
  stadiumMap,
} from "../../test/fixtures";
import { expectInvalidProps, expectNoA11yViolations, renderUI } from "../../test/utils";
import { SiteHeader } from "../organisms/Header";
import { EventBanner } from "../organisms/EventDetail";
import {
  FanIdPage,
  LoginPage,
  MessagePage,
  MyTicketsPage,
  RefundRequestPage,
  RefundsPage,
  ResalePage,
  SignUpPage,
  TicketWalletPage,
} from "./AccountPages";
import { ConcertDetailPage, EventsPage, HomePage, MatchDetailPage } from "./DiscoveryPages";
import {
  ArenaTicketsPage,
  CheckoutPage,
  CinemaSeatsPage,
  HallSeatsPage,
  OrderConfirmationPage,
  StadiumSeatsPage,
  WaitingRoomPage,
  ZoneSelectionPage,
} from "./PurchasePages";

const NOW = () => new Date("2026-10-01T10:00:00+03:00").getTime();
const header = (
  <SiteHeader
    links={[{ id: "matches", label: "Matches", href: "/events" }]}
    account={{ status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/tickets" }}
  />
);
const banner = <EventBanner eyebrow="PREMIER LEAGUE" title="Nile FC vs Delta SC" meta="Sun 18 Oct" theme="pitch" />;
const brand = { title: "One account for every match and every show", bullets: ["Get alerts", "Pay your way"] };
const nav = [
  { href: "/tickets", label: "Upcoming (3)", current: true },
  { href: "/refunds", label: "Refunds (3)" },
];

describe("HomePage", () => {
  it("renders featured events, chips, grid, coming soon and callout", async () => {
    const onCategoryChange = vi.fn();
    const { user } = renderUI(
      <HomePage
        header={header}
        featured={[
          {
            event: matchDetail,
            primaryAction: { label: "Join the waiting room", href: "/q" },
            secondaryAction: { label: "Match details", href: "/m" },
          },
        ]}
        categories={["All", "Cup"]}
        category="All"
        onCategoryChange={onCategoryChange}
        onSale={[matchSummary, concertSummary]}
        hrefFor={(e) => `/events/${e.slug}`}
        comingSoon={{ events: [comingSoonSummary], notifiedIds: [], onNotify: () => {} }}
        callout={{
          eyebrow: "NEEDED FOR FOOTBALL MATCHES",
          title: "Get your Fan ID in five minutes",
          body: "Scan your ID.",
          action: { label: "Start verification", href: "/fan-id" },
        }}
      />,
      { now: NOW },
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/official tickets/i);
    expect(screen.getByRole("region", { name: "Featured" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cup" }));
    expect(onCategoryChange).toHaveBeenCalledWith("Cup");
    expect(screen.getByRole("link", { name: "Start verification" })).toHaveAttribute("href", "/fan-id");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("validates props", () => {
    expectInvalidProps(
      () =>
        renderUI(
          <HomePage
            header={header}
            featured={[]}
            categories={[]}
            category="All"
            onCategoryChange={() => {}}
            onSale={[]}
            hrefFor={() => "/"}
            comingSoon={{ events: [], notifiedIds: [], onNotify: () => {} }}
          />,
        ),
      /categories/,
    );
  });
});

describe("EventsPage", () => {
  it("switches tabs and searches", async () => {
    const onTabChange = vi.fn();
    const onSearchChange = vi.fn();
    const { user } = renderUI(
      <EventsPage
        header={header}
        tab="matches"
        onTabChange={onTabChange}
        search=""
        onSearchChange={onSearchChange}
        filters={{ categories: [], cities: [], availableOnly: false }}
        onFiltersChange={() => {}}
        onClearFilters={() => {}}
        facets={{ categories: ["Premier League", "Cup"], cities: ["cairo"] }}
        results={{ status: "success", events: [matchSummary] }}
        hrefFor={(e) => `/events/${e.slug}`}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Matches" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Concerts & events" }));
    expect(onTabChange).toHaveBeenCalledWith("concerts");
    await user.type(screen.getByRole("searchbox", { name: "Search events" }), "N");
    expect(onSearchChange).toHaveBeenCalledWith("N");
    expect(screen.getByText("1 upcoming event")).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("event detail pages", () => {
  it("renders the match page with the buy box and Fan ID notice", async () => {
    renderUI(
      <MatchDetailPage
        header={header}
        event={matchDetail}
        breadcrumbs={[{ label: "Matches", href: "/events" }, { label: "Premier League" }]}
        buyBox={{ saleOpensAt: matchDetail.saleOpensAt, priceFrom: 75, action: { label: "Join the waiting room", href: "/q" } }}
        fanIdNotice={{ tone: "success", title: "Your Fan ID is approved", body: "2 linked fans ready" }}
      />,
      { now: NOW },
    );
    expect(screen.getByRole("complementary", { name: "Buy tickets" })).toHaveTextContent("Tickets from 75 EGP");
    expect(screen.getByRole("heading", { name: "FAQ" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Your Fan ID is approved");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("renders the concert page", async () => {
    renderUI(
      <ConcertDetailPage
        header={header}
        event={concertDetail}
        breadcrumbs={[{ label: "Concerts & events", href: "/events" }, { label: "Pop" }]}
        buyBox={{
          priceFrom: 450,
          action: { label: "Get tickets", href: "/t" },
          scarcityNote: "Golden Circle: few left",
          presale: { onApply: () => {} },
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Running order" })).toBeInTheDocument();
    expect(screen.getByText("Verified organiser")).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("purchase pages", () => {
  it("waiting room shows loading, errors and the queue", async () => {
    const props = { event: matchSummary, chooseHref: "/z", leaveHref: "/m", maskedPhone: "+20 10•• ••• 482", onSmsChange: () => {} };
    const { rerender } = renderUI(<WaitingRoomPage {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent("Joining the waiting room");
    rerender(<WaitingRoomPage {...props} error="Sign in to continue" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign in to continue");
    rerender(<WaitingRoomPage {...props} status={queueInLine} />);
    expect(screen.getByRole("heading", { name: "You're in line" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave the waiting room" })).toHaveAttribute("href", "/m");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("zone page totals the order from zone and fans", async () => {
    const onContinue = vi.fn();
    const { user } = renderUI(
      <ZoneSelectionPage
        header={header}
        contextBar={{ title: "Nile FC vs Delta SC", meta: "Sun 18 Oct", expiresAt: "2026-10-01T10:09:42+03:00" }}
        zones={stadiumMap.zones}
        zoneId="cat1"
        onZoneChange={() => {}}
        fans={fans}
        fanIds={["fan_omar", "fan_youssef"]}
        onFansChange={() => {}}
        maxTickets={4}
        serviceFee={15}
        cta={{ onContinue }}
      />,
      { now: NOW },
    );
    const summary = screen.getByRole("region", { name: "Order summary" });
    expect(summary).toHaveTextContent("Category 1 × 2500 EGP");
    expect(summary).toHaveTextContent("530 EGP");
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(onContinue).toHaveBeenCalled();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("stadium seats page wires block, seats and best-together", async () => {
    const onToggleSeat = vi.fn();
    const onBestTogether = vi.fn();
    const { user } = renderUI(
      <StadiumSeatsPage
        header={header}
        banner={banner}
        blocks={stadiumMap.blocks}
        blockId="W2"
        onBlockChange={() => {}}
        selected={["W2-A-1"]}
        onToggleSeat={onToggleSeat}
        onBestTogether={onBestTogether}
        maxSeats={4}
        serviceFee={15}
        panel={{ onRemove: () => {} }}
        cta={{ onContinue: () => {} }}
      />,
    );
    expect(screen.getByRole("heading", { name: "2 · Block W2 seats" })).toBeInTheDocument();
    expect(screen.getByText("Block W2 · Row A · Seat 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Row B seat 2, available, 250 EGP" }));
    expect(onToggleSeat).toHaveBeenCalledWith("W2-B-2");
    await user.click(screen.getByRole("button", { name: "Best 2 together" }));
    expect(onBestTogether).toHaveBeenCalled();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("arena, hall and cinema pages render their pickers", async () => {
    const { unmount } = renderUI(
      <ArenaTicketsPage
        header={header}
        contextBar={{ title: "Layla Nour — Live in Cairo", meta: "Fri 30 Oct" }}
        ticketTypes={arenaMap.ticketTypes}
        quantities={{ gc: 2 }}
        onQuantitiesChange={() => {}}
        onFocusChange={() => {}}
        maxTickets={8}
        serviceFee={25}
        cta={{ onContinue: () => {} }}
      />,
    );
    expect(screen.getByRole("region", { name: "Order summary" })).toHaveTextContent("1,850 EGP");
    await expectNoA11yViolations(document.body, { page: true });
    unmount();

    const hall = renderUI(
      <HallSeatsPage
        header={header}
        banner={banner}
        map={hallMap}
        tierFilter="all"
        onTierFilterChange={() => {}}
        selected={["A-1"]}
        onToggleSeat={() => {}}
        maxSeats={8}
        serviceFee={25}
        panel={{ onRemove: () => {} }}
        cta={{ onContinue: () => {} }}
      />,
    );
    expect(screen.getByText("Stalls · Row A · Seat 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All prices" })).toHaveAttribute("aria-pressed", "true");
    await expectNoA11yViolations(document.body, { page: true });
    hall.unmount();

    const { rerender } = renderUI(
      <CinemaSeatsPage
        header={header}
        banner={banner}
        showtimes={cinemaMap.showtimes}
        showtimeId="st_0_2"
        onShowtimeChange={() => {}}
        selected={[]}
        onToggleSeat={() => {}}
        maxSeats={10}
        bookingFee={10}
        screenLabel="Screen 4"
        panel={{ onRemove: () => {} }}
        cta={{ onContinue: () => {} }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading seats");
    rerender(
      <CinemaSeatsPage
        header={header}
        banner={banner}
        showtimes={cinemaMap.showtimes}
        showtimeId="st_0_2"
        onShowtimeChange={() => {}}
        seats={cinemaSeats}
        selected={["J-1"]}
        onToggleSeat={() => {}}
        maxSeats={10}
        bookingFee={10}
        screenLabel="Screen 4"
        panel={{ onRemove: () => {} }}
        cta={{ onContinue: () => {} }}
      />,
    );
    expect(screen.getByText("VIP recliner · 380 EGP")).toBeInTheDocument();
    expect(screen.getByText("390 EGP")).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("checkout and confirmation pages", async () => {
    const { unmount } = renderUI(<CheckoutPage header={header} hold={hold} backHref="/back" form={{ onSubmit: () => {} }} />, { now: NOW });
    expect(screen.getByRole("link", { name: "← Back to tickets" })).toHaveAttribute("href", "/back");
    expect(screen.getByRole("timer")).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
    unmount();
    const onAdd = vi.fn();
    const { user } = renderUI(
      <OrderConfirmationPage
        header={header}
        order={order}
        ticketsHref="/tickets"
        onAddToCalendar={() => {}}
        onDownloadReceipt={() => {}}
        parking={{ onAdd, added: false }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "You're going" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add parking" }));
    expect(onAdd).toHaveBeenCalled();
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("after-purchase pages", () => {
  it("my tickets lists stubs with actions and alerts", async () => {
    renderUI(
      <MyTicketsPage
        header={header}
        nav={nav}
        alerts={[
          {
            id: "a1",
            tone: "warning",
            title: "Delta SC vs Red Sea FC has been postponed.",
            body: "Keep or refund.",
            action: { label: "See refund", href: "/refunds" },
          },
        ]}
        status="success"
        tickets={[matchTicket, concertTicket]}
        showQrHref={(t) => `/tickets/${t.id}`}
        refundHref={(t) => `/refunds/new?order=${t.orderId}`}
        browseHref="/events"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "My tickets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See refund" })).toHaveAttribute("href", "/refunds");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("my tickets handles empty and error states", () => {
    const base = { header, nav, alerts: [], tickets: [], showQrHref: () => "/", browseHref: "/events" };
    const { rerender } = renderUI(<MyTicketsPage {...base} status="success" />);
    expect(screen.getByText("No upcoming tickets")).toBeInTheDocument();
    rerender(<MyTicketsPage {...base} status="error" onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load your tickets");
  });

  it("wallet pages through tickets in a group", async () => {
    const onIndexChange = vi.fn();
    const onSelect = vi.fn();
    const { user } = renderUI(
      <TicketWalletPage
        header={header}
        groups={[
          { key: "ord_1", tickets: [matchTicket, matchTicket2] },
          { key: "ord_2", tickets: [concertTicket] },
        ]}
        selectedKey="ord_1"
        onSelect={onSelect}
        index={0}
        onIndexChange={onIndexChange}
        backHref="/tickets"
      />,
      { now: NOW },
    );
    expect(screen.getByText("Ticket 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next ticket" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: /Layla Nour Live/ }));
    expect(onSelect).toHaveBeenCalledWith("ord_2");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("resale page shows the form, listings or an empty state", async () => {
    const props = {
      header,
      backHref: "/tickets",
      listings,
      steps: ["List your ticket at up to face value."],
      browseHref: "/events",
    };
    const form = {
      tickets: [{ id: "t1", label: "Seat 18", price: 250 }],
      payoutOptions: [{ id: "wallet" as const, name: "Mobile wallet", note: "+20" }],
      onSubmit: () => {},
    };
    const { rerender } = renderUI(<ResalePage {...props} form={form} success="Listed for 250 EGP" />);
    expect(screen.getByRole("heading", { level: 1, name: "Sell your ticket" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Listed for 250 EGP");
    await expectNoA11yViolations(document.body, { page: true });
    rerender(<ResalePage {...props} form={{ ...form, tickets: [] }} />);
    expect(screen.getByText("No tickets you can resell")).toBeInTheDocument();
  });

  it("refund request and refund status pages", async () => {
    const { unmount } = renderUI(
      <RefundRequestPage
        backHref="/tickets"
        wizard={{
          options: refundOptions,
          step: 1,
          onStepChange: () => {},
          onSubmit: () => {},
          trackHref: "/refunds",
          ticketsHref: "/tickets",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "← Back to my tickets" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
    unmount();
    const onCancel = vi.fn();
    const { user } = renderUI(
      <RefundsPage
        header={header}
        nav={nav}
        status="success"
        refunds={[refundInReview, refundDone]}
        onCancel={onCancel}
        policies={[{ title: "Matches", body: "Full refund if cancelled.", tone: "ink" }]}
      />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /Cancel request/ }));
    expect(onCancel).toHaveBeenCalledWith("rf_1");
    await expectNoA11yViolations(document.body, { page: true });
  });
});

describe("account pages", () => {
  it("sign up switches between details and OTP", async () => {
    const { rerender } = renderUI(<SignUpPage stage="details" brand={brand} signUp={{ onSubmit: () => {}, loginHref: "/login" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
    rerender(
      <SignUpPage
        stage="otp"
        brand={brand}
        otp={{
          maskedPhone: "+20 11•• ••• 678",
          resendAvailableAt: new Date().toISOString(),
          onSubmit: () => {},
          onResend: () => {},
          onChangeNumber: () => {},
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Enter the code" })).toBeInTheDocument();
  });

  it("login, Fan ID and message pages", async () => {
    const login = renderUI(
      <LoginPage brand={brand} login={{ onSubmit: () => {}, signUpHref: "/signup" }} notice="Sign in to continue to checkout." />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sign in to continue");
    await expectNoA11yViolations(document.body, { page: true });
    login.unmount();

    const fan = renderUI(
      <FanIdPage
        header={header}
        wizard={{ step: 1, onStepChange: () => {}, onScan: () => {}, onSubmit: () => {}, browseHref: "/events", skipHref: "/" }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Get your Fan ID" })).toBeInTheDocument();
    await expectNoA11yViolations(document.body, { page: true });
    fan.unmount();

    renderUI(
      <MessagePage
        header={header}
        code="404"
        title="Page not found"
        body="We couldn't find that page."
        action={{ label: "Go home", href: "/" }}
      />,
    );
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    await expectNoA11yViolations(document.body, { page: true });
  });

  it("validates discriminated sign up stages", () => {
    // @ts-expect-error otp props missing
    expectInvalidProps(() => renderUI(<SignUpPage stage="otp" brand={brand} />), /otp/);
  });
});
