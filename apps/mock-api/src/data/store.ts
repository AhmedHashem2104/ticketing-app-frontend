import { randomBytes, randomUUID } from "node:crypto";
import type {
  EventDetail,
  Fan,
  FanIdStatus,
  Hold,
  Order,
  QueueStatus,
  Refund,
  ResaleListing,
  Ticket,
  TicketVariant,
  User,
} from "@repo/contracts";
import { initialsOf } from "@repo/contracts";
import { buildCatalog, EVENT_IDS } from "./catalog";
import { addHours, dayLabel, numericDateLabel, stubDateLabel, timeLabel } from "./time";

export type StoredUser = Omit<User, "linkedFans" | "fanId"> & {
  phone: string;
  password: string;
  fanId: FanIdStatus;
  fans: Fan[];
};

export type StoredHold = Hold & { userId: string; seatKeys: string[]; soldKey: string; ticketSpecs: TicketSpec[]; createdAt: string };

export type TicketSpec = {
  holderName: string;
  holderDetail: string;
  seatLabel: string;
  fields: { key: string; value: string }[];
  price: number;
  priceLabel: string;
};

export type StoredQueue = { id: string; userId: string; eventId: string; createdAt: number; smsOptIn: boolean };

export type Verification = { id: string; userId: string; code: string; createdAt: number };

export type StoredRefund = Refund & { userId: string; ticketIds: string[] };

export const DEMO_USER = {
  phone: "1012345482",
  password: "matchpass123",
  otp: "123456",
};

const variantFor = (event: EventDetail): TicketVariant =>
  event.kind === "match" ? "ink" : event.kind === "cinema" || event.layout === "hall" ? "purple" : "lime";

export class Store {
  now: () => Date;
  events: EventDetail[] = [];
  users = new Map<string, StoredUser>();
  sessions = new Map<string, string>();
  verifications = new Map<string, Verification>();
  scans = new Map<string, { userId: string; documentType: string }>();
  holds = new Map<string, StoredHold>();
  orders = new Map<string, Order & { userId: string }>();
  tickets = new Map<string, Ticket & { userId: string }>();
  refunds = new Map<string, StoredRefund>();
  listings = new Map<string, ResaleListing & { userId: string }>();
  queues = new Map<string, StoredQueue>();
  notifications = new Set<string>();
  /** Sold seat keys per event (and cinema showtime): `${eventId}` or `${eventId}:${showtimeId}`. */
  sold = new Map<string, Set<string>>();
  private counters = { order: 58_213, refund: 91, ticket: 61_100 };

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
    this.reset();
  }

  reset() {
    const now = this.now();
    this.events = buildCatalog(now);
    for (const map of [
      this.users,
      this.sessions,
      this.verifications,
      this.scans,
      this.holds,
      this.orders,
      this.tickets,
      this.refunds,
      this.listings,
      this.queues,
      this.sold,
    ]) {
      map.clear();
    }
    this.notifications.clear();
    this.counters = { order: 58_213, refund: 91, ticket: 61_100 };
    seed(this);
  }

  id(prefix: string) {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }

  token() {
    return randomBytes(24).toString("hex");
  }

  nextOrderReference() {
    this.counters.order += 1;
    const d = this.now();
    return `MP-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${this.counters.order}`;
  }

  nextRefundReference() {
    this.counters.refund += 1;
    const d = this.now();
    return `RF-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(this.counters.refund).padStart(4, "0")}`;
  }

  nextTicketCode() {
    this.counters.ticket += 1;
    return `MP-${this.counters.ticket}`;
  }

  eventById(id: string) {
    return this.events.find((e) => e.id === id);
  }

  eventBySlug(slug: string) {
    return this.events.find((e) => e.slug === slug);
  }

  soldFor(key: string) {
    let set = this.sold.get(key);
    if (!set) {
      set = new Set();
      this.sold.set(key, set);
    }
    return set;
  }

  toUser(user: StoredUser): User {
    const { phone: _phone, password: _password, fans, ...rest } = user;
    return { ...rest, linkedFans: fans };
  }

  issueTicket(
    userId: string,
    orderId: string,
    event: EventDetail,
    spec: TicketSpec,
    index: number,
    of: number,
  ): Ticket & { userId: string } {
    const now = this.now();
    const start = new Date(event.startsAt);
    const hoursUntil = (start.getTime() - now.getTime()) / 3_600_000;
    const isMatch = event.kind === "match";
    const isCinema = event.kind === "cinema";
    const qrReady = isCinema || hoursUntil <= 24;
    const unlockAt = addHours(start, isMatch ? -24 : -24);
    const refundable = isCinema ? hoursUntil > 2 : !isMatch && hoursUntil > 24 * 7;
    const ticket: Ticket & { userId: string } = {
      id: this.id("tkt"),
      code: this.nextTicketCode(),
      userId,
      orderId,
      eventId: event.id,
      eventSlug: event.slug,
      eventKind: event.kind,
      theme: event.theme,
      variant: variantFor(event),
      status: "valid",
      kindLabel: event.tag.toUpperCase(),
      title: event.title.replace(" — Live in Cairo", " Live"),
      startsAt: event.startsAt,
      dateLabel: stubDateLabel(event.startsAt),
      whenLabel: `${dayLabel(event.startsAt)} · ${isMatch ? `Kick-off ${timeLabel(event.startsAt)} · Gates ${event.gatesOpenAt ?? ""}` : isCinema ? `${timeLabel(event.startsAt)} · ${event.venue.name}` : `Doors ${event.doorsAt ?? ""} · Show ${timeLabel(event.startsAt)}`}`,
      time: timeLabel(event.startsAt),
      timeLabel: isMatch
        ? `Kick-off · gates open ${event.gatesOpenAt ?? ""}`
        : isCinema
          ? "Screen 4 · trailers 15 min"
          : `On stage · doors ${event.doorsAt ?? ""}`,
      venueName: event.venue.name,
      venueArea: event.venue.area,
      priceLabel: spec.priceLabel,
      price: spec.price,
      fields: spec.fields,
      seatLabel: spec.seatLabel,
      holderName: spec.holderName,
      holderInitials: initialsOf(spec.holderName),
      holderDetail: spec.holderDetail,
      holderDate: numericDateLabel(event.startsAt),
      position: { index, of },
      progress: Math.max(0, Math.min(100, Math.round(100 - hoursUntil / 7.2))),
      qrReady,
      qrUnlockLabel: `Appears ${dayLabel(unlockAt.toISOString())} at ${timeLabel(unlockAt.toISOString())}, 24 hours before ${isMatch ? "kick-off" : "gates open"}.`,
      entryInfo: isMatch
        ? `Enter through Gate ${spec.fields.find((f) => f.key === "Gate")?.value ?? "7"}. Gate staff will check your face against your Fan ID. Parking P2 is closest.`
        : isCinema
          ? "Scan your QR at the Screen 4 entrance. Arrive 15 minutes early for trailers."
          : "Your entrance opens with the doors. Wristbands are handed out after your QR is scanned.",
      transferMode: isMatch ? "fan_id" : "contact",
      transferNote: isMatch
        ? "Matches: tickets can only go to an approved Fan ID. They must accept within 24 hours."
        : "Your friend gets a new QR; yours stops working once they accept.",
      refundable,
      refundNote: refundable
        ? isCinema
          ? "Refundable until 2 hours before showtime"
          : `Refundable until ${dayLabel(addHours(start, -24 * 7).toISOString())}`
        : isMatch
          ? "Refund not available — sell on official resale instead"
          : "Refund window closed — sell on official resale instead",
      resaleAllowed: !isCinema,
    };
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }
}

/* ---------- Seed ---------- */

function seed(store: Store) {
  const now = store.now();
  const userId = "usr_omar";
  const fans: Fan[] = [
    { id: "fan_omar", name: "Omar K. (you)", initials: "OK", fanIdMasked: "Fan ID •••• 4821", status: "approved", isSelf: true },
    { id: "fan_youssef", name: "Youssef A.", initials: "YA", fanIdMasked: "Fan ID •••• 1907", status: "approved", isSelf: false },
    { id: "fan_mariam", name: "Mariam K.", initials: "MK", fanIdMasked: "Fan ID •••• 3350", status: "approved", isSelf: false },
    {
      id: "fan_hassan",
      name: "Hassan M.",
      initials: "HM",
      fanIdMasked: "Fan ID under review — can’t buy yet",
      status: "under_review",
      isSelf: false,
    },
  ];
  store.users.set(userId, {
    id: userId,
    fullName: "Omar Khaled",
    initials: "OK",
    phone: DEMO_USER.phone,
    phoneMasked: "+20 10•• ••• 482",
    email: "omar.k@mail.com",
    password: DEMO_USER.password,
    fanId: { status: "approved", number: "2210 4417 4821", validUntil: "Oct 2029", nameEn: "Omar Khaled" },
    fans,
    credit: 0,
  });

  const event = (id: string) => store.eventById(id)!;

  // Derby: 2 tickets for Omar and Youssef.
  const derby = event(EVENT_IDS.derby);
  seedOrder(store, userId, derby, [
    matchSpec("Omar K.", "Fan ID •••• 4821 · bring your ID card", "W3", "L", 18, 250),
    matchSpec("Youssef A.", "Fan ID •••• 1907 · bring your ID card", "W3", "L", 19, 250),
  ]);
  store.soldFor(derby.id).add("W3-L-18").add("W3-L-19");

  // Layla Nour: 2 Golden Circle tickets (refundable).
  const layla = event(EVENT_IDS.layla);
  seedOrder(
    store,
    userId,
    layla,
    [1, 2].map((n) => gaSpec("Omar K.", "Golden", "Standing", "B", `${n} / 2`, layla.priceFrom * 2)),
  );

  // Cinema: a showing a few hours from now so the QR is live and the refund window is open.
  const film = event(EVENT_IDS.film);
  const soon = addHours(now, 3);
  const filmAt = new Date(Math.ceil(soon.getTime() / (15 * 60_000)) * 15 * 60_000).toISOString();
  const filmEvent = { ...film, startsAt: filmAt };
  seedOrder(store, userId, filmEvent, [
    {
      holderName: "Omar K.",
      holderDetail: "Matchpass account",
      seatLabel: "Row F · Seat 7",
      price: 220,
      priceLabel: "[Price · 220 EGP]",
      fields: [
        { key: "Seat", value: "07" },
        { key: "Row", value: "F" },
        { key: "Screen", value: "4" },
        { key: "Format", value: "IMAX" },
      ],
    },
  ]);

  // Cairo Jazz Nights: 2-day pass, QR not unlocked yet.
  const jazz = event(EVENT_IDS.jazz);
  seedOrder(store, userId, jazz, [
    {
      holderName: "Omar K.",
      holderDetail: "Matchpass account",
      seatLabel: "2-day pass · Entrance A",
      price: jazz.priceFrom,
      priceLabel: `[Price · ${jazz.priceFrom} EGP]`,
      fields: [
        { key: "Entrance", value: "A" },
        { key: "Pass", value: "2-day" },
        { key: "Type", value: "Standing" },
        { key: "Ticket", value: "1 / 1" },
      ],
    },
  ]);

  // History: postponed match refunded automatically.
  const postponed = event(EVENT_IDS.postponed);
  const postponedOrder = seedOrder(store, userId, postponed, [
    matchSpec("Omar K.", "Fan ID •••• 4821", "E2", "E", 22, 150),
    matchSpec("Youssef A.", "Fan ID •••• 1907", "E2", "E", 23, 150),
  ]);
  for (const t of postponedOrder.tickets) store.tickets.get(t.id)!.status = "refunded";
  const refundedTicket = { ...store.tickets.get(postponedOrder.tickets[0]!.id)! };
  const { userId: _u, ...refundedTicketPublic } = refundedTicket;
  const refundA: StoredRefund = {
    id: "rf_postponed",
    reference: "RF-2409-0077",
    orderId: postponedOrder.id,
    userId,
    ticketIds: postponedOrder.tickets.map((t) => t.id),
    requestedLabel: "AUTOMATIC",
    eventTitle: postponed.title,
    detail: "Match postponed · 2 × Category 2 · automatic refund",
    amount: 330,
    destination: "To mobile wallet · received",
    status: "refunded",
    statusLabel: "Refunded",
    steps: [
      { label: "Requested", when: "Automatic", state: "done" },
      { label: "Reviewing", when: "Automatic", state: "done" },
      { label: "Approved", when: "Same day", state: "done" },
      { label: "Money sent", when: "Next day", state: "done" },
    ],
    note: "Refunded in full, including 30 EGP service fees, because the match was postponed.",
    noteTone: "success",
    canCancel: false,
    secondaryAction: "Download refund receipt",
    refundedTicket: { ...refundedTicketPublic, status: "refunded" },
  };
  store.refunds.set(refundA.id, refundA);

  // History: cinema refund that came too late.
  store.refunds.set("rf_cinema_late", {
    id: "rf_cinema_late",
    reference: "RF-2409-0052",
    orderId: "ord_history_cinema",
    userId,
    ticketIds: [],
    requestedLabel: "21 SEP",
    eventTitle: "The Last Lighthouse",
    detail: "1 × Standard · Screen 4 · 21 Sep, 19:00",
    amount: 150,
    destination: "Requested to Matchpass credit",
    status: "rejected",
    statusLabel: "Not approved",
    steps: [
      { label: "Requested", when: "21 Sep, 18:20", state: "done" },
      { label: "Not approved", when: "21 Sep, 18:35", state: "failed" },
      { label: "Approved", when: "—", state: "todo" },
      { label: "Money sent", when: "—", state: "todo" },
    ],
    note: "The request came 40 minutes before the showtime. Cinema refunds close 2 hours before the film starts.",
    noteTone: "danger",
    canCancel: false,
    secondaryAction: "Contact support",
  });

  // Resale history.
  store.listings.set("lst_canal_sold", {
    id: "lst_canal_sold",
    userId,
    ticketId: "tkt_history_canal",
    title: "Canal United vs Sinai Stars",
    price: 50,
    payout: 47.5,
    status: "sold",
    detail: "50 EGP · paid out 47.50",
  });
}

export function matchSpec(holder: string, detail: string, block: string, row: string, seat: number, price: number): TicketSpec {
  const side = block[0];
  const gate = side === "W" ? "7" : side === "E" ? "10" : side === "N" ? "2" : "13";
  return {
    holderName: holder,
    holderDetail: detail,
    seatLabel: `${block} · Row ${row} · Seat ${seat}`,
    price,
    priceLabel: `[Price · ${price} EGP]`,
    fields: [
      { key: "Seat", value: String(seat) },
      { key: "Block", value: block },
      { key: "Row", value: row },
      { key: "Gate", value: gate },
    ],
  };
}

export function gaSpec(holder: string, area: string, type: string, entrance: string, position: string, price: number): TicketSpec {
  return {
    holderName: holder,
    holderDetail: "Matchpass account · photo ID not needed",
    seatLabel: `${area} · ${type} · Entrance ${entrance}`,
    price,
    priceLabel: `[Price · ${price} EGP]`,
    fields: [
      { key: "Area", value: area },
      { key: "Type", value: type },
      { key: "Entrance", value: entrance },
      { key: "Ticket", value: position },
    ],
  };
}

function seedOrder(store: Store, userId: string, event: EventDetail, specs: TicketSpec[]) {
  const orderId = store.id("ord");
  const tickets = specs.map((spec, i) => store.issueTicket(userId, orderId, event, spec, i + 1, specs.length));
  const order: Order & { userId: string } = {
    id: orderId,
    userId,
    reference: store.nextOrderReference(),
    status: "paid",
    eventSlug: event.slug,
    eventTitle: event.title,
    eventTag: event.tag.toUpperCase(),
    eventMeta: `${dayLabel(event.startsAt)} · ${timeLabel(event.startsAt)} · ${event.venue.name}`,
    eventKind: event.kind,
    theme: event.theme,
    entryNote: "",
    total: specs.reduce((sum, s) => sum + s.price + event.serviceFee, 0),
    paymentLabel: "Paid by card •••• 0042",
    createdAt: store.now().toISOString(),
    tickets: tickets.map(({ userId: _u, ...t }) => t),
    nextSteps: [],
  };
  store.orders.set(orderId, order);
  return order;
}

export type QueueView = QueueStatus;
