import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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
  fawryOrder,
  incomingTransfer,
  notifications,
  outgoingTransfer,
  resaleOffers,
  user,
} from "../fixtures";
import { bestTogether, toggleSeat } from "../lib/seating";
import { EventBanner } from "../organisms/EventDetail";
import { SiteFooter, SiteHeader } from "../organisms/Header";
import {
  AccountPage,
  FanIdPage,
  ForgotPasswordPage,
  InfoPage,
  LoginPage,
  NotificationsPage,
  ResaleMarketPage,
  TransfersPage,
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

const links = [
  { id: "matches", label: "Matches", href: "/events?tab=matches" },
  { id: "concerts", label: "Concerts & events", href: "/events?tab=concerts" },
  { id: "resale", label: "Resale", href: "/resale" },
  { id: "tickets", label: "My tickets", href: "/tickets" },
];
const header = (active?: string) => (
  <SiteHeader links={links} activeId={active} account={{ status: "signed_in", initials: "OK", name: "Omar Khaled", href: "/tickets" }} />
);
const footer = (
  <SiteFooter
    tagline="Official tickets for football, concerts and live events."
    columns={[{ title: "Fans", links: [{ label: "Matches", href: "/events" }] }]}
  />
);
const brand = {
  title: "One account for every match and every show",
  bullets: [
    "Get alerts the moment your club or artist goes on sale",
    "Pay with card, wallet, InstaPay or Fawry",
    "Tickets on your phone — transfer or resell safely",
  ],
};
const nav = [
  { href: "/tickets", label: "Upcoming (3)", current: true },
  { href: "/tickets?scope=past", label: "Past" },
  { href: "/refunds", label: "Refunds (2)" },
];
const future = (ms: number) => new Date(Date.now() + ms).toISOString();

const meta = {
  title: "Pages/Screens",
  component: HomePage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomePage>;

export default meta;
// Screens are composed in `render`, so stories carry no shared args.
type Story = StoryObj;

function HomeDemo() {
  const [category, setCategory] = useState("All");
  return (
    <HomePage
      header={header()}
      footer={footer}
      featured={[
        {
          event: matchDetail,
          primaryAction: { label: "Join the waiting room", href: "/q" },
          secondaryAction: { label: "Match details", href: "/m" },
        },
        {
          event: concertDetail,
          primaryAction: { label: "Get tickets", href: "/t" },
          secondaryAction: { label: "Lineup & info", href: "/i" },
        },
      ]}
      categories={["All", "Premier League", "Concerts"]}
      category={category}
      onCategoryChange={setCategory}
      onSale={[matchSummary, concertSummary].filter((e) => category === "All" || e.category === category)}
      hrefFor={(e) => `/events/${e.slug}`}
      comingSoon={{ events: [comingSoonSummary], notifiedIds: [], onNotify: () => {} }}
      callout={{
        eyebrow: "NEEDED FOR FOOTBALL MATCHES",
        title: "Get your Fan ID in five minutes",
        body: "Scan your ID and take a selfie.",
        action: { label: "Start verification", href: "/fan-id" },
      }}
    />
  );
}
export const Home: Story = { render: () => <HomeDemo /> };

export const Browse: Story = {
  render: () => (
    <EventsPage
      header={header("matches")}
      footer={footer}
      tab="matches"
      onTabChange={() => {}}
      search=""
      onSearchChange={() => {}}
      filters={{ categories: [], cities: [], availableOnly: false }}
      onFiltersChange={() => {}}
      onClearFilters={() => {}}
      facets={{ categories: ["Premier League", "Cup", "National team"], cities: ["cairo", "alexandria"] }}
      results={{ status: "success", events: [matchSummary, comingSoonSummary] }}
      hrefFor={(e) => `/events/${e.slug}`}
    />
  ),
};

export const MatchDetail: Story = {
  render: () => (
    <MatchDetailPage
      header={header("matches")}
      footer={footer}
      event={matchDetail}
      breadcrumbs={[{ label: "Matches", href: "/events" }, { label: "Premier League" }, { label: "Matchday 12" }]}
      buyBox={{
        saleOpensAt: future(2 * 86_400_000),
        priceFrom: 75,
        action: { label: "Join the waiting room", href: "/q" },
        reminder: { active: false, onSet: () => {} },
        onAddToCalendar: () => {},
      }}
      fanIdNotice={{ tone: "success", title: "Your Fan ID is approved", body: "2 linked fans ready: Youssef A., Mariam K." }}
    />
  ),
};

export const ConcertDetail: Story = {
  render: () => (
    <ConcertDetailPage
      header={header("concerts")}
      footer={footer}
      event={concertDetail}
      breadcrumbs={[{ label: "Concerts & events", href: "/events" }, { label: "Pop" }]}
      buyBox={{
        priceFrom: 450,
        scarcityNote: "Golden Circle: few left",
        action: { label: "Get tickets", href: "/t" },
        presale: { onApply: () => {} },
      }}
    />
  ),
};

export const WaitingRoom: Story = {
  render: () => (
    <WaitingRoomPage
      event={matchSummary}
      status={queueInLine}
      chooseHref="/t"
      leaveHref="/m"
      maskedPhone="+20 10•• ••• 482"
      onSmsChange={() => {}}
      readyNote="Your Fan ID and 2 linked fans are ready."
    />
  ),
};

function ZonesDemo() {
  const [zoneId, setZoneId] = useState("cat1");
  const [fanIds, setFanIds] = useState(["fan_omar", "fan_youssef"]);
  return (
    <ZoneSelectionPage
      header={header("matches")}
      contextBar={{ title: "Nile FC vs Delta SC", meta: "Sun 18 Oct · 20:00 · Capital Stadium", expiresAt: future(582_000) }}
      zones={stadiumMap.zones}
      zoneId={zoneId}
      onZoneChange={setZoneId}
      fans={fans}
      fanIds={fanIds}
      onFansChange={setFanIds}
      maxTickets={4}
      serviceFee={15}
      exactSeatsHref="/seats"
      linkFanHref="/fan-id"
      cta={{ onContinue: () => {} }}
    />
  );
}
export const MatchZones: Story = { render: () => <ZonesDemo /> };

function StadiumDemo() {
  const [blockId, setBlockId] = useState("W2");
  const [state, setState] = useState<{ selected: string[]; message?: string }>({ selected: [] });
  const block = stadiumMap.blocks.find((b) => b.id === blockId)!;
  return (
    <StadiumSeatsPage
      header={header("matches")}
      banner={
        <EventBanner
          eyebrow="PREMIER LEAGUE · MATCHDAY 12"
          title="Nile FC vs Delta SC"
          meta="Sun 18 Oct · 20:00 · Capital Stadium"
          theme="pitch"
        />
      }
      blocks={stadiumMap.blocks}
      blockId={blockId}
      onBlockChange={setBlockId}
      selected={state.selected}
      onToggleSeat={(id) => setState(toggleSeat(state.selected, id, 3, "You can pick up to 3 seats."))}
      onBestTogether={() => setState(bestTogether(block, state.selected, 2, 3))}
      maxSeats={3}
      serviceFee={15}
      panel={{ message: state.message, onRemove: (id) => setState({ selected: state.selected.filter((x) => x !== id) }) }}
      cta={{ onContinue: () => {} }}
    />
  );
}
export const StadiumSeats: Story = { render: () => <StadiumDemo /> };

function ArenaDemo() {
  const [qty, setQty] = useState<Record<string, number>>({ gc: 2 });
  const [focus, setFocus] = useState("gc");
  return (
    <ArenaTicketsPage
      header={header("concerts")}
      contextBar={{ title: "Layla Nour — Live in Cairo", meta: "Fri 30 Oct · Doors 19:00 · Nile Arena, New Cairo" }}
      ticketTypes={arenaMap.ticketTypes}
      note={arenaMap.note}
      quantities={qty}
      onQuantitiesChange={setQty}
      focusedId={focus}
      onFocusChange={setFocus}
      maxTickets={8}
      serviceFee={25}
      cta={{ onContinue: () => {} }}
    />
  );
}
export const ArenaTickets: Story = { render: () => <ArenaDemo /> };

function HallDemo() {
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  return (
    <HallSeatsPage
      header={header("concerts")}
      banner={
        <EventBanner
          eyebrow="CLASSICAL · ONE NIGHT"
          title="Nile Philharmonic: Film Classics"
          meta="Sat 6 Dec · 20:00 · Opera Hall"
          theme="violet"
        />
      }
      map={hallMap}
      tierFilter={filter}
      onTierFilterChange={setFilter}
      selected={selected}
      onToggleSeat={(id) => setSelected(toggleSeat(selected, id, 8, "Up to 8").selected)}
      maxSeats={8}
      serviceFee={25}
      panel={{ onRemove: (id) => setSelected((s) => s.filter((x) => x !== id)) }}
      cta={{ onContinue: () => {} }}
    />
  );
}
export const ConcertHall: Story = { render: () => <HallDemo /> };

function CinemaDemo() {
  const [showtimeId, setShowtimeId] = useState("st_0_2");
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <CinemaSeatsPage
      header={header()}
      banner={
        <EventBanner
          eyebrow="DRAMA · 2H 08M · PG-13"
          title="The Last Lighthouse"
          meta="Matchpass Cinemas · City Mall · Screen 4"
          theme="ink"
          poster
        />
      }
      showtimes={cinemaMap.showtimes}
      showtimeId={showtimeId}
      onShowtimeChange={setShowtimeId}
      seats={cinemaSeats}
      selected={selected}
      onToggleSeat={(id) => setSelected(toggleSeat(selected, id, 10, "Up to 10").selected)}
      maxSeats={10}
      bookingFee={10}
      screenLabel="Screen 4"
      panel={{ onRemove: (id) => setSelected((s) => s.filter((x) => x !== id)) }}
      cta={{ onContinue: () => {} }}
    />
  );
}
export const Cinema: Story = { render: () => <CinemaDemo /> };

export const Checkout: Story = {
  render: () => (
    <CheckoutPage
      header={header("matches")}
      hold={{ ...hold, expiresAt: future(438_000) }}
      backHref="/tickets"
      form={{ onSubmit: () => {}, promo: { onApply: () => {} } }}
    />
  ),
};

export const OrderConfirmed: Story = {
  render: () => (
    <OrderConfirmationPage
      header={header("tickets")}
      order={order}
      ticketsHref="/tickets"
      onAddToCalendar={() => {}}
      onDownloadReceipt={() => {}}
      parking={{ onAdd: () => {}, added: false }}
    />
  ),
};

export const MyTickets: Story = {
  render: () => (
    <MyTicketsPage
      header={header("tickets")}
      nav={nav}
      alerts={[
        {
          id: "a1",
          tone: "warning",
          title: "Delta SC vs Red Sea FC has been postponed.",
          body: "Keep your tickets or get a full refund.",
          action: { label: "See refund", href: "/refunds" },
        },
      ]}
      status="success"
      tickets={[matchTicket, concertTicket]}
      showQrHref={(t) => `/tickets/${t.id}`}
      transferHref={(t) => `/tickets/${t.id}?transfer=1`}
      resaleHref={(t) => `/resale?ticket=${t.id}`}
      refundHref={(t) => `/refunds/new?order=${t.orderId}`}
      browseHref="/events"
    />
  ),
};

function WalletDemo() {
  const [index, setIndex] = useState(0);
  const [key, setKey] = useState("ord_1");
  const [open, setOpen] = useState(false);
  return (
    <TicketWalletPage
      header={header("tickets")}
      groups={[
        { key: "ord_1", tickets: [matchTicket, matchTicket2] },
        { key: "ord_2", tickets: [concertTicket] },
      ]}
      selectedKey={key}
      onSelect={(k) => {
        setKey(k);
        setIndex(0);
      }}
      index={index}
      onIndexChange={setIndex}
      transfer={{ open, onOpenChange: setOpen, onSubmit: () => {} }}
      resaleHref={(t) => `/resale?ticket=${t.id}`}
      backHref="/tickets"
    />
  );
}
export const TicketWallet: Story = { render: () => <WalletDemo /> };

export const Resale: Story = {
  render: () => (
    <ResalePage
      header={header("resale")}
      backHref="/tickets"
      form={{
        tickets: [{ id: "t1", label: "Nile FC vs Delta SC · W3 Row L Seat 19", price: 250 }],
        payoutOptions: [{ id: "wallet", name: "Mobile wallet", note: "+20 10•• ••• 482" }],
        onSubmit: () => {},
      }}
      listings={listings}
      steps={["List your ticket at up to face value.", "Money arrives within 2 working days after the sale."]}
      browseHref="/events"
    />
  ),
};

function RefundDemo() {
  const [step, setStep] = useState(1);
  return (
    <RefundRequestPage
      backHref="/tickets"
      wizard={{
        options: refundOptions,
        step,
        onStepChange: setStep,
        onSubmit: () => setStep(5),
        result: refundInReview,
        trackHref: "/refunds",
        ticketsHref: "/tickets",
      }}
    />
  );
}
export const RefundRequest: Story = { render: () => <RefundDemo /> };

export const Refunds: Story = {
  render: () => (
    <RefundsPage
      header={header("tickets")}
      nav={[
        { href: "/tickets", label: "Upcoming (3)" },
        { href: "/tickets?scope=past", label: "Past" },
        { href: "/refunds", label: "Refunds (2)", current: true },
      ]}
      status="success"
      refunds={[refundInReview, refundDone]}
      onCancel={() => {}}
      onSecondary={() => {}}
      policies={[
        { title: "Matches", body: "Full refund if the match is cancelled or postponed.", tone: "ink" },
        { title: "Concerts", body: "Refund up to 7 days before the show.", tone: "lime" },
        { title: "Cinema", body: "Refund up to 2 hours before the showtime.", tone: "plum" },
      ]}
    />
  ),
};

export const SignUp: Story = {
  render: () => <SignUpPage stage="details" brand={brand} signUp={{ onSubmit: () => {}, loginHref: "/login" }} />,
};

export const SignUpOtp: Story = {
  render: () => (
    <SignUpPage
      stage="otp"
      brand={brand}
      otp={{
        maskedPhone: "+20 10•• ••• 482",
        resendAvailableAt: future(45_000),
        onSubmit: () => {},
        onResend: () => {},
        onChangeNumber: () => {},
        note: "Next we'll set up your Fan ID.",
      }}
    />
  ),
};

export const Login: Story = {
  render: () => <LoginPage brand={brand} login={{ onSubmit: () => {}, signUpHref: "/signup", forgotHref: "/forgot-password" }} />,
};

function FanIdDemo() {
  const [step, setStep] = useState(1);
  return (
    <FanIdPage
      header={header()}
      wizard={{
        step,
        onStepChange: setStep,
        onScan: () => setStep(3),
        extracted: {
          scanId: "s",
          nameEn: "Omar Khaled",
          nameAr: "عمر خالد",
          idNumberMasked: "2 98 •••• •••• 21",
          dateOfBirth: "14 / 03 / 1998",
        },
        onSubmit: () => setStep(5),
        approved: { name: "Omar Khaled", number: "2210 4417 4821", validUntil: "Oct 2029" },
        browseHref: "/events",
        skipHref: "/",
      }}
    />
  );
}
export const FanId: Story = { render: () => <FanIdDemo /> };

export const NotFound: Story = {
  render: () => (
    <MessagePage
      header={header()}
      footer={footer}
      code="404"
      title="Page not found"
      body="The page you're looking for doesn't exist."
      action={{ label: "Go to the home page", href: "/" }}
    />
  ),
};

export const Account: Story = {
  render: () => (
    <AccountPage
      header={header()}
      status="success"
      profile={{ user, fanIdHref: "/fan-id", onSignOut: () => {} }}
      fans={{ fans, onLink: () => {}, onUnlink: () => {}, canLink: true }}
      preferences={{ defaultValues: user.preferences, onSubmit: () => {} }}
      links={[
        { label: "Ticket transfers", description: "Accept tickets sent to you", href: "/transfers" },
        { label: "Refunds", description: "Track refund requests", href: "/refunds" },
      ]}
    />
  ),
};

export const ForgotPassword: Story = {
  render: () => (
    <ForgotPasswordPage
      brand={brand}
      form={{ stage: "request", onRequest: () => {}, onReset: () => {}, onStartOver: () => {}, loginHref: "/login" }}
    />
  ),
};

export const Transfers: Story = {
  render: () => (
    <TransfersPage
      header={header("tickets")}
      status="success"
      incoming={{ transfers: [incomingTransfer], onAccept: () => {}, onDecline: () => {} }}
      outgoing={{ transfers: [outgoingTransfer], onCancel: () => {} }}
      backHref="/tickets"
    />
  ),
};

export const Notifications: Story = {
  render: () => <NotificationsPage header={header()} status="success" items={notifications} onMarkAllRead={() => {}} />,
};

export const OfficialResale: Story = {
  render: () => (
    <ResaleMarketPage
      header={header("matches")}
      event={matchSummary}
      status="success"
      offers={resaleOffers}
      onBuy={() => {}}
      backHref="/events/nile-fc-vs-delta-sc"
    />
  ),
};

export const PaymentPending: Story = {
  render: () => <OrderConfirmationPage header={header()} order={fawryOrder} ticketsHref="/tickets" />,
};

export const HelpCentre: Story = {
  render: () => (
    <InfoPage
      header={header()}
      footer={footer}
      eyebrow="Help"
      title="Help centre"
      intro="Everything about buying, using and passing on your tickets."
      sections={[
        { id: "fan-id", title: "Fan ID", paragraphs: ["Football matches need an approved Fan ID for every ticket holder."] },
        {
          id: "refunds",
          title: "Refunds",
          paragraphs: ["Concerts can be refunded up to 7 days before the event. Matches can be resold at face value."],
        },
      ]}
      contact={{ label: "Contact support", href: "/info/contact" }}
    />
  ),
};
