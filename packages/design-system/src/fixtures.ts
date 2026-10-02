/** Typed sample data matching the API contracts — used by tests and the showcase app. */
import type {
  ArenaSeatMap,
  CinemaSeatMap,
  CinemaSeats,
  EventDetail,
  EventSummary,
  Fan,
  Notification,
  HallSeatMap,
  Hold,
  Order,
  QrToken,
  QueueStatus,
  Refund,
  RefundOptions,
  ResaleListing,
  ResaleOffer,
  StadiumSeatMap,
  Ticket,
  Transfer,
  User,
} from "@repo/contracts";

export const matchSummary: EventSummary = {
  id: "evt_nile_delta",
  slug: "nile-fc-vs-delta-sc",
  kind: "match",
  layout: "stadium",
  category: "Premier League",
  title: "Nile FC vs Delta SC",
  tag: "Premier League · Matchday 12",
  art: "Nile v Delta",
  theme: "pitch",
  imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
  startsAt: "2026-10-18T20:00:00+03:00",
  venue: { name: "Capital Stadium", area: "Cairo", city: "cairo" },
  priceFrom: 75,
  status: "queue",
  statusLabel: "Waiting room open",
  requiresFanId: true,
  maxPerOrder: 4,
  serviceFee: 15,
  homeTeam: { name: "Nile FC", short: "NFC", logoUrl: "/images/teams/nfc.svg" },
  awayTeam: { name: "Delta SC", short: "DSC", logoUrl: "/images/teams/dsc.svg" },
};

export const concertSummary: EventSummary = {
  id: "evt_layla_nour",
  slug: "layla-nour-live-in-cairo",
  kind: "concert",
  layout: "arena",
  category: "Concerts",
  title: "Layla Nour — Live in Cairo",
  subtitle: "with special guests The Felucca Band",
  tag: "Concert · Pop",
  art: "Layla Nour Live",
  theme: "plum",
  imageUrl: "/images/events/layla-nour-live-in-cairo.jpg",
  startsAt: "2026-10-30T20:00:00+03:00",
  venue: { name: "Nile Arena", area: "New Cairo", city: "cairo" },
  priceFrom: 450,
  status: "few_left",
  statusLabel: "Few left",
  requiresFanId: false,
  maxPerOrder: 8,
  serviceFee: 25,
};

export const comingSoonSummary: EventSummary = {
  ...matchSummary,
  id: "evt_egypt",
  slug: "egypt-vs-morocco",
  imageUrl: "/images/events/egypt-vs-morocco.jpg",
  title: "Egypt vs Morocco",
  tag: "National team · Qualifier",
  category: "National team",
  startsAt: "2026-11-14T21:00:00+02:00",
  status: "coming_soon",
  statusLabel: "Coming soon",
  priceFrom: 100,
  homeTeam: { name: "Egypt", short: "EGY", logoUrl: "/images/teams/egy.svg" },
  awayTeam: { name: "Morocco", short: "MAR", logoUrl: "/images/teams/mar.svg" },
};

export const matchDetail: EventDetail = {
  ...matchSummary,
  headline: "Saturday 18 October · Kick-off 20:00 · Gates open 18:00 · Capital Stadium, Cairo",
  description: "Derby day.",
  saleOpensAt: "2026-10-04T14:30:00+03:00",
  gatesOpenAt: "18:00",
  badges: ["Fan ID required", "Max 4 tickets per order", "Separate home & away zones"],
  priceTable: [
    { name: "VIP lounge", where: "West upper tier", price: 600, availability: "few_left", availabilityLabel: "Few left" },
    { name: "Category 1", where: "West stand", price: 250, availability: "available", availabilityLabel: "Available" },
    { name: "Away fans", where: "South curve", price: 75, availability: "restricted", availabilityLabel: "Delta SC fans only" },
  ],
  priceNote: "A 15 EGP service fee per ticket is added at checkout.",
  gates: [
    { gates: "Gates 1–4", area: "North curve" },
    { gates: "Gates 5–8", area: "West stand & VIP" },
  ],
  gatesNote: "Parking P2 and P3 open early.",
  rulesTitle: "Before you buy",
  rules: ["Every ticket is tied to an approved Fan ID.", "One ticket per Fan ID."],
  faqs: [
    { question: "How does the waiting room work?", answer: "Everyone inside gets a random place in line." },
    { question: "When do I get the QR code?", answer: "24 hours before kick-off." },
  ],
  queueEnabled: true,
  presaleCodeEnabled: false,
};

export const concertDetail: EventDetail = {
  ...concertSummary,
  headline: "Fri 30 Oct · Doors 19:00 · Nile Arena, New Cairo",
  description: "One night only.",
  doorsAt: "19:00",
  badges: [],
  priceTable: [
    { name: "General admission", where: "Standing, main floor", price: 450, availability: "available", availabilityLabel: "Available" },
    { name: "Golden Circle", where: "Standing, closest to the stage", price: 900, availability: "few_left", availabilityLabel: "Few left" },
  ],
  priceNote: "Max 8 tickets per order · 25 EGP service fee per ticket",
  rulesTitle: "Good to know",
  rules: ["Small bags only."],
  faqs: [{ question: "Do I need a Fan ID for concerts?", answer: "No." }],
  runningOrder: [
    { time: "19:00", label: "Doors open" },
    { time: "21:15", label: "Layla Nour", headline: true },
  ],
  facts: [
    { label: "DATE", value: "Friday 30 October" },
    { label: "VENUE", value: "Nile Arena, New Cairo" },
  ],
  promoter: "Nile Live Productions",
  scarcityNote: "Golden Circle: few left",
  queueEnabled: false,
  presaleCodeEnabled: true,
};

export const fans: Fan[] = [
  {
    id: "fan_omar",
    name: "Omar K. (you)",
    initials: "OK",
    avatarUrl: "/images/avatars/omar.jpg",
    fanIdMasked: "Fan ID •••• 4821",
    status: "approved",
    isSelf: true,
  },
  {
    id: "fan_youssef",
    name: "Youssef A.",
    initials: "YA",
    avatarUrl: "/images/avatars/youssef.jpg",
    fanIdMasked: "Fan ID •••• 1907",
    status: "approved",
    isSelf: false,
  },
  {
    id: "fan_hassan",
    name: "Hassan M.",
    initials: "HM",
    avatarUrl: "/images/avatars/hassan.jpg",
    fanIdMasked: "Fan ID under review — can’t buy yet",
    status: "under_review",
    isSelf: false,
  },
];

export const user: User = {
  id: "usr_omar",
  fullName: "Omar Khaled",
  initials: "OK",
  avatarUrl: "/images/avatars/omar.jpg",
  phoneMasked: "+20 10•• ••• 482",
  email: "omar.k@mail.com",
  fanId: { status: "approved", number: "2210 4417 4821", validUntil: "Oct 2029", nameEn: "Omar Khaled" },
  linkedFans: fans,
  credit: 0,
  preferences: { sms: true, email: true, marketing: false },
};

/** A fan who has just signed up and has no Fan ID yet. */
export const newUser: User = {
  id: "usr_sara",
  fullName: "Sara Ahmed",
  initials: "SA",
  phoneMasked: "+20 11•• ••• 678",
  fanId: { status: "none" },
  linkedFans: [],
  credit: 0,
  preferences: { sms: true, email: false, marketing: false },
};

const row = (label: string, seats: string) => ({ label, seats });

export const stadiumMap: StadiumSeatMap = {
  layout: "stadium",
  zones: [
    {
      id: "vip",
      name: "VIP lounge",
      short: "VIP",
      side: "W",
      where: "West upper tier",
      gates: "5–8",
      note: "Lounge access.",
      price: 600,
      availability: "few_left",
      availabilityLabel: "Few left",
      restricted: false,
    },
    {
      id: "cat1",
      name: "Category 1",
      short: "Category 1",
      side: "W",
      where: "West stand",
      gates: "5–8",
      note: "Covered.",
      price: 250,
      availability: "available",
      availabilityLabel: "Available",
      restricted: false,
    },
    {
      id: "cat2",
      name: "Category 2",
      short: "Category 2",
      side: "E",
      where: "East stand",
      gates: "9–12",
      note: "Open-air.",
      price: 150,
      availability: "available",
      availabilityLabel: "Available",
      restricted: false,
    },
    {
      id: "cat3",
      name: "Category 3",
      short: "Category 3",
      side: "N",
      where: "North curve",
      gates: "1–4",
      note: "Home end.",
      price: 75,
      availability: "high_demand",
      availabilityLabel: "High demand",
      restricted: false,
    },
    {
      id: "away",
      name: "Away fans",
      short: "Away",
      side: "S",
      where: "South curve",
      gates: "13–14",
      note: "Away end.",
      price: 75,
      availability: "restricted",
      availabilityLabel: "Delta SC Fan IDs only",
      restricted: true,
      restrictedLabel: "Delta SC Fan IDs only",
    },
  ],
  blocks: (["N", "W", "E", "S"] as const).flatMap((side) =>
    [1, 2, 3, 4].map((i) => ({
      id: `${side}${i}`,
      side,
      sideName: { N: "North curve", W: "West stand", E: "East stand", S: "South curve" }[side],
      zoneId: { N: "cat3", W: "cat1", E: "cat2", S: "away" }[side],
      category: { N: "Category 3", W: "Category 1", E: "Category 2", S: "Away fans" }[side],
      price: { N: 75, W: 250, E: 150, S: 75 }[side],
      away: side === "S",
      facing: "▶ PITCH IS THIS WAY ▶",
      rows: [row("A", "aaxaw"), row("B", side === "N" && i === 2 ? "xxxxx" : "aaaaa")],
    })),
  ),
};

export const arenaMap: ArenaSeatMap = {
  layout: "arena",
  note: "Accessible platform at Entrance C.",
  ticketTypes: [
    {
      id: "gc",
      name: "Golden Circle",
      description: "Standing, closest to the stage",
      mapLabel: "Golden Circle · standing",
      price: 900,
      swatch: "#3B1F6B",
      remaining: 40,
      tag: "Few left",
    },
    {
      id: "ga",
      name: "General admission",
      description: "Standing, main floor",
      mapLabel: "General admission · standing",
      price: 450,
      swatch: "#6B4FA0",
      remaining: 1200,
    },
    {
      id: "vip",
      name: "VIP package",
      description: "Box seat, lounge",
      mapLabel: "VIP boxes & lounge",
      price: 2500,
      swatch: "#121512",
      remaining: 6,
      tag: "6 left",
    },
  ],
};

export const hallMap: HallSeatMap = {
  layout: "hall",
  tiers: [
    { id: "A", name: "Category A", where: "Stalls rows A–B", price: 600, swatch: "#5A3A8C", edge: "#3B1F6B", onSwatch: "#FFFFFF" },
    { id: "D", name: "Balcony", where: "Row M", price: 150, swatch: "#E4DCF2", edge: "#8A70BD", onSwatch: "#121512" },
  ],
  sections: [
    { id: "stalls", title: "STALLS", rows: [{ label: "A", tierId: "A", seats: "aaxaaa", aisles: [2, 4] }] },
    { id: "balcony", title: "BALCONY", rows: [{ label: "M", tierId: "D", seats: "awaa", aisles: [2] }] },
  ],
};

export const cinemaMap: CinemaSeatMap = {
  layout: "cinema",
  screen: "Screen 4",
  showtimes: [
    {
      id: "st_0_0",
      date: "2026-10-02",
      dayLabel: "Today",
      dayNumber: "2",
      time: "13:30",
      format: "2D",
      availability: "good",
      availabilityLabel: "Good availability",
      prices: { standard: 150, vip: 300 },
    },
    {
      id: "st_0_2",
      date: "2026-10-02",
      dayLabel: "Today",
      dayNumber: "2",
      time: "19:00",
      format: "IMAX",
      availability: "filling",
      availabilityLabel: "Filling up",
      prices: { standard: 220, vip: 380 },
    },
    {
      id: "st_1_0",
      date: "2026-10-03",
      dayLabel: "Sat",
      dayNumber: "3",
      time: "13:30",
      format: "2D",
      availability: "almost_full",
      availabilityLabel: "Almost full",
      prices: { standard: 150, vip: 300 },
    },
  ],
};

export const cinemaSeats: CinemaSeats = {
  showtimeId: "st_0_2",
  rows: [
    { label: "A", vip: false, seats: "waxa", aisles: [2] },
    { label: "J", vip: true, seats: "aaxa", aisles: [2] },
  ],
};

export const hold: Hold = {
  id: "hold_1",
  eventId: matchSummary.id,
  eventSlug: matchSummary.slug,
  eventTitle: matchSummary.title,
  eventTag: "PREMIER LEAGUE · MATCHDAY 12",
  eventMeta: "Sat 18 Oct · 20:00 · Capital Stadium",
  eventKind: "match",
  theme: "pitch",
  imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
  expiresAt: "2026-10-01T10:10:00+03:00",
  lines: [
    { label: "Category 1 · West stand × 2", quantity: 2, unitPrice: 250, amount: 500 },
    { label: "Service fee × 2", quantity: 2, unitPrice: 15, amount: 30 },
  ],
  seats: ["W3 · Row F · Seat 7", "W3 · Row F · Seat 8"],
  ticketCount: 2,
  subtotal: 500,
  fees: 30,
  discount: 0,
  total: 530,
  holdersTitle: "Ticket holders",
  holders: [
    { initials: "OK", avatarUrl: "/images/avatars/omar.jpg", name: "Omar K.", detail: "Fan ID •••• 4821" },
    { initials: "YA", avatarUrl: "/images/avatars/youssef.jpg", name: "Youssef A.", detail: "Fan ID •••• 1907" },
  ],
  holdersNote: "Tickets are tied to these Fan IDs.",
  backHref: "/events/nile-fc-vs-delta-sc/tickets",
};

const baseTicket: Ticket = {
  id: "tkt_1",
  code: "MP-58213",
  orderId: "ord_1",
  eventId: matchSummary.id,
  eventSlug: matchSummary.slug,
  eventKind: "match",
  theme: "pitch",
  imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
  variant: "ink",
  status: "valid",
  kindLabel: "PREMIER LEAGUE · MATCHDAY 12",
  title: "Nile FC vs Delta SC",
  startsAt: matchSummary.startsAt,
  dateLabel: "18 OCT, 2026",
  whenLabel: "Sat 18 Oct · Kick-off 20:00 · Gates 18:00",
  time: "20:00",
  timeLabel: "Kick-off · gates open 18:00",
  venueName: "Capital Stadium",
  venueArea: "Cairo",
  priceLabel: "250 EGP",
  price: 250,
  fields: [
    { key: "Seat", value: "18" },
    { key: "Block", value: "W3" },
    { key: "Row", value: "L" },
    { key: "Gate", value: "7" },
  ],
  seatLabel: "W3 · Row L · Seat 18",
  holderName: "Omar K.",
  holderInitials: "OK",
  holderAvatarUrl: "/images/avatars/omar.jpg",
  holderDetail: "Fan ID •••• 4821 · bring your ID card",
  holderDate: "18.10.26",
  position: { index: 1, of: 2 },
  progress: 70,
  qrReady: true,
  qrUnlockLabel: "Appears Fri 17 Oct at 20:00, 24 hours before kick-off.",
  entryInfo: "Enter through Gate 7.",
  transferMode: "fan_id",
  transferNote: "Matches: tickets can only go to an approved Fan ID.",
  refundable: false,
  refundNote: "Refund not available — sell on official resale instead",
  resaleAllowed: true,
};

export const matchTicket = baseTicket;
export const matchTicket2: Ticket = {
  ...baseTicket,
  id: "tkt_2",
  code: "MP-58214",
  holderName: "Youssef A.",
  holderInitials: "YA",
  holderAvatarUrl: "/images/avatars/youssef.jpg",
  position: { index: 2, of: 2 },
  seatLabel: "W3 · Row L · Seat 19",
};
export const concertTicket: Ticket = {
  ...baseTicket,
  id: "tkt_3",
  code: "MP-60417",
  orderId: "ord_2",
  eventId: concertSummary.id,
  eventSlug: concertSummary.slug,
  eventKind: "concert",
  theme: "plum",
  imageUrl: "/images/events/layla-nour-live-in-cairo.jpg",
  variant: "lime",
  kindLabel: "CONCERT · POP",
  title: "Layla Nour Live",
  startsAt: concertSummary.startsAt,
  fields: [
    { key: "Area", value: "Golden" },
    { key: "Type", value: "Standing" },
    { key: "Entrance", value: "B" },
    { key: "Ticket", value: "1 / 2" },
  ],
  seatLabel: "Golden · Standing · Entrance B",
  price: 900,
  priceLabel: "900 EGP",
  qrReady: false,
  transferMode: "contact",
  transferNote: "Your friend gets a new QR.",
  refundable: true,
  refundNote: "Refundable until 23 Oct",
};

export const order: Order = {
  id: "ord_1",
  reference: "MP-2410-58213",
  holdId: "hold_1",
  status: "paid",
  payment: { method: "card" },
  eventSlug: matchSummary.slug,
  eventTitle: matchSummary.title,
  eventTag: "PREMIER LEAGUE · MATCHDAY 12",
  eventMeta: "Sat 18 Oct · 20:00 · Capital Stadium",
  eventKind: "match",
  theme: "pitch",
  imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
  entryNote: "Gates open 18:00 · Use Gate 7",
  total: 530,
  paymentLabel: "Paid by card •••• 0042",
  createdAt: "2026-10-01T10:05:00+03:00",
  tickets: [matchTicket, matchTicket2],
  nextSteps: [
    { title: "QR appears 24 hours before kick-off", body: "In My tickets." },
    { title: "Bring your ID card", body: "Gate staff check your Fan ID." },
  ],
  parkingOffer: { title: "Add parking for this match", detail: "P2 West · 50 EGP", price: 50 },
};

export const queueWaiting: QueueStatus = {
  id: "q1",
  eventId: matchSummary.id,
  phase: "waiting",
  opensInSeconds: 6,
  ahead: 3412,
  total: 3412,
  etaMinutes: 6,
  progress: 0,
  smsOptIn: false,
  turnWindowMinutes: 10,
};
export const queueInLine: QueueStatus = { ...queueWaiting, phase: "in_line", opensInSeconds: 0, ahead: 1706, etaMinutes: 3, progress: 50 };
export const queueTurn: QueueStatus = { ...queueWaiting, phase: "your_turn", opensInSeconds: 0, ahead: 0, etaMinutes: 0, progress: 100 };

export const refundInReview: Refund = {
  id: "rf_1",
  imageUrl: "/images/events/layla-nour-live-in-cairo.jpg",
  reference: "RF-2410-0091",
  orderId: "ord_2",
  requestedLabel: "1 OCT",
  eventTitle: "Layla Nour Live",
  detail: "2 × Golden Circle · reason: can’t attend",
  amount: 1800,
  destination: "To card •••• 0042",
  status: "in_review",
  statusLabel: "In review",
  steps: [
    { label: "Requested", when: "1 Oct, 14:02", state: "done" },
    { label: "Reviewing", when: "By 2 Oct", state: "current" },
    { label: "Approved", when: "Tickets cancelled", state: "todo" },
    { label: "Money sent", when: "5–10 working days", state: "todo" },
  ],
  note: "Your tickets stay valid until we approve the refund.",
  noteTone: "neutral",
  canCancel: true,
  secondaryAction: "View order",
};

export const refundDone: Refund = {
  ...refundInReview,
  id: "rf_2",
  reference: "RF-2409-0077",
  eventTitle: "Delta SC vs Red Sea FC",
  status: "refunded",
  statusLabel: "Refunded",
  steps: refundInReview.steps.map((s) => ({ ...s, state: "done" as const })),
  noteTone: "success",
  note: "Refunded in full.",
  canCancel: false,
  secondaryAction: "Download refund receipt",
  refundedTicket: { ...matchTicket, status: "refunded" },
};

export const refundOptions: RefundOptions = {
  orderId: "ord_2",
  reference: "MP-2410-60417",
  eventTitle: "Layla Nour Live",
  eventDateLabel: "30 OCT",
  tickets: [
    { id: "tkt_3", label: "Golden Circle · Ticket 1", meta: "Omar K. · Entrance B · MP-60417", price: 900 },
    { id: "tkt_4", label: "Golden Circle · Ticket 2", meta: "Omar K. · Entrance B · MP-60418", price: 900 },
  ],
  serviceFeePerTicket: 25,
  deadlineNote: "Refundable until Thu 23 Oct",
  methods: [
    {
      id: "card",
      name: "Original card •••• 0042",
      note: "Back to the card you paid with",
      time: "5–10 working days",
      tag: "5–10 days",
      bonusRate: 0,
    },
    {
      id: "credit",
      name: "Matchpass credit",
      note: "Use it on any event",
      time: "Instantly, once approved",
      tag: "+5% bonus",
      bonusRate: 0.05,
    },
  ],
};

export const listings: ResaleListing[] = [
  {
    id: "lst_1",
    ticketId: "tkt_x",
    title: "Cairo Jazz Nights · 2-day",
    imageUrl: "/images/events/cairo-jazz-nights.jpg",
    price: 300,
    payout: 285,
    status: "listed",
    detail: "300 EGP",
  },
  {
    id: "lst_2",
    ticketId: "tkt_y",
    title: "Canal United vs Sinai Stars",
    imageUrl: "/images/events/canal-united-vs-sinai-stars.jpg",
    price: 50,
    payout: 47.5,
    status: "sold",
    detail: "50 EGP · paid out 47.50",
  },
];

export const walletPendingOrder: Order = {
  ...order,
  id: "ord_wallet",
  status: "pending_payment",
  payment: {
    method: "wallet",
    expiresAt: "2026-10-01T10:15:00+03:00",
    instructions: "Approve the payment request we sent to your mobile wallet (•••• 482).",
  },
  paymentLabel: "Paid by mobile wallet •••• 482",
  tickets: [],
};

export const fawryOrder: Order = {
  ...order,
  id: "ord_fawry",
  status: "pending_payment",
  payment: {
    method: "fawry",
    reference: "712345678",
    expiresAt: "2026-10-03T10:05:00+03:00",
    instructions: "Pay at any Fawry outlet or in the myFawry app before Sat 3 Oct at 10:05. Your tickets appear as soon as you pay.",
  },
  paymentLabel: "Paid at Fawry",
  tickets: [],
};

export const failedOrder: Order = {
  ...order,
  id: "ord_failed",
  status: "payment_failed",
  payment: { method: "card", failureReason: "Your bank declined the payment. Try another card or payment method." },
  paymentLabel: "Card payment",
  tickets: [],
};

export const expiredOrder: Order = { ...fawryOrder, id: "ord_expired", status: "expired" };

export const incomingTransfer: Transfer = {
  id: "trf_1",
  ticketId: "tkt_9",
  status: "pending",
  direction: "incoming",
  fromName: "Omar Khaled",
  recipientLabel: "Fan ID •••• 1907",
  eventTitle: "Nile FC vs Delta SC",
  eventSlug: "nile-fc-vs-delta-sc",
  imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
  seatLabel: "W3 · Row L · Seat 18",
  startsAt: "2026-10-18T20:00:00+03:00",
  createdAt: "2026-10-01T10:00:00+03:00",
  expiresAt: "2026-10-02T10:00:00+03:00",
};

export const outgoingTransfer: Transfer = {
  ...incomingTransfer,
  id: "trf_2",
  direction: "outgoing",
  recipientLabel: "fri•••com",
  eventTitle: "Layla Nour Live",
  eventSlug: "layla-nour-live-in-cairo",
  imageUrl: "/images/events/layla-nour-live-in-cairo.jpg",
  seatLabel: "Golden · Standing · Entrance B",
};

export const resaleOffers: ResaleOffer[] = [
  {
    id: "lst_resale_2",
    eventId: "evt_nile_canal",
    label: "Fan resale · E1",
    seatLabel: "E1 · Row F · Seat 12",
    price: 150,
    faceValue: 150,
    requiresFanId: true,
  },
  {
    id: "lst_resale_1",
    eventId: "evt_nile_canal",
    label: "Fan resale · W2",
    seatLabel: "W2 · Row D · Seat 7",
    price: 240,
    faceValue: 250,
    requiresFanId: true,
  },
];

export const notifications: Notification[] = [
  {
    id: "ntf_1",
    kind: "transfer",
    title: "Omar Khaled sent you a ticket",
    body: "Nile FC vs Delta SC · W3 · Row L · Seat 18. Accept within 24 hours.",
    href: "/transfers",
    imageUrl: "/images/events/nile-fc-vs-delta-sc.jpg",
    createdAt: "2026-10-01T09:55:00+03:00",
    read: false,
  },
  {
    id: "ntf_2",
    kind: "event",
    title: "Delta SC vs Red Sea FC has been postponed",
    body: "Your 2 tickets were refunded in full, including fees.",
    href: "/refunds",
    imageUrl: "/images/events/delta-sc-vs-red-sea-fc.jpg",
    createdAt: "2026-09-28T12:00:00+03:00",
    read: true,
  },
];

export const qrToken: QrToken = {
  token: "MPQ1.dGt0XzEuNTgzMTIxMjM0.c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWc",
  expiresAt: "2026-10-01T10:00:30+03:00",
  refreshInSeconds: 30,
};
