import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  EventDetail,
  Fan,
  FanIdStatus,
  Hold,
  Notification,
  Order,
  Refund,
  ResaleListing,
  Ticket,
  TicketVariant,
  Transfer,
  User,
} from "@repo/contracts";
import { dayjs, initialsOf } from "@repo/contracts";
import { buildCatalog, EVENT_IDS } from "./catalog";
import { addHours, dayLabel, hoursUntil, numericDateLabel, stubDateLabel, timeLabel, yearMonthCode } from "./time";

/* ---------- Stored shapes (server-only fields stay out of API responses) ---------- */

export type StoredFan = Fan & { number?: string };

export type StoredUser = Omit<User, "linkedFans" | "fanId"> & {
  phone: string;
  password: string;
  fanId: FanIdStatus;
  fans: StoredFan[];
  /** Approval time for a Fan ID under review (the KYC provider's answer, simulated). */
  fanIdReviewAt?: number;
  usedPromos: string[];
};

export type TicketSpec = {
  holderName: string;
  holderDetail: string;
  seatLabel: string;
  fields: { key: string; value: string }[];
  price: number;
  priceLabel: string;
  /** Fan ID number (digits) the ticket is tied to — matches allow one ticket per Fan ID. */
  fanNumber?: string;
};

export type StoredTicket = Ticket & { userId: string; fanNumber?: string };

export type StoredHold = Hold & {
  userId: string;
  seatKeys: string[];
  soldKey: string;
  ticketSpecs: TicketSpec[];
  createdAt: string;
  listingId?: string;
};

export type StoredOrder = Order & { userId: string; fulfilled: boolean; approveAt?: number };

export type StoredQueue = { id: string; userId: string; eventId: string; createdAt: number; smsOptIn: boolean };

export type Verification = { id: string; userId?: string; code: string; createdAt: number; attempts: number; purpose: "signup" | "reset" };

export type StoredRefund = Refund & { userId: string; ticketIds: string[] };

export type StoredListing = ResaleListing & { userId: string; eventId: string; faceValue: number; seatLabel: string };

export type StoredTransfer = Omit<Transfer, "direction"> & {
  fromUserId: string;
  toUserId?: string;
  recipientKey: string;
};

export type StoreOptions = { qrSecret?: string };

export const DEMO_USER = { phone: "1012345482", password: "matchpass123", otp: "123456" };
export const SECOND_USER = { phone: "1098765432", password: "matchpass123", fanNumber: "221044171907" };

export const QR_PERIOD_SECONDS = 30;

const variantFor = (event: Pick<EventDetail, "kind" | "layout">): TicketVariant =>
  event.kind === "match" ? "ink" : event.kind === "cinema" || event.layout === "hall" ? "purple" : "lime";

const digits = (value: string) => value.replace(/\D/g, "");

export class Store {
  now: () => Date;
  readonly options: Required<StoreOptions>;
  events: EventDetail[] = [];
  users = new Map<string, StoredUser>();
  sessions = new Map<string, string>();
  verifications = new Map<string, Verification>();
  scans = new Map<string, { userId: string; documentType: string; nameEn: string }>();
  holds = new Map<string, StoredHold>();
  orders = new Map<string, StoredOrder>();
  tickets = new Map<string, StoredTicket>();
  refunds = new Map<string, StoredRefund>();
  listings = new Map<string, StoredListing>();
  transfers = new Map<string, StoredTransfer>();
  /** Hosted payment page sessions: session id → order id. */
  paymentSessions = new Map<string, string>();
  queues = new Map<string, StoredQueue>();
  notifications = new Map<string, Notification & { userId: string }>();
  subscriptions = new Set<string>();
  loginFailures = new Map<string, number[]>();
  /** Sold seat keys per event (and cinema showtime): `${eventId}` or `${eventId}:${showtimeId}`. */
  sold = new Map<string, Set<string>>();
  private counters = { order: 58_213, refund: 91, ticket: 61_100 };

  constructor(now: () => Date = () => new Date(), options: StoreOptions = {}) {
    this.now = now;
    this.options = { qrSecret: options.qrSecret ?? "matchpass-dev-qr-secret-not-for-production" };
    this.reset();
  }

  reset() {
    this.events = buildCatalog(this.now());
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
      this.transfers,
      this.paymentSessions,
      this.queues,
      this.notifications,
      this.loginFailures,
      this.sold,
    ]) {
      map.clear();
    }
    this.subscriptions.clear();
    this.counters = { order: 58_213, refund: 91, ticket: 61_100 };
    seed(this);
  }

  /* ---------- ids ---------- */

  id(prefix: string) {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }

  token() {
    return randomBytes(24).toString("hex");
  }

  private yymm() {
    return yearMonthCode(this.now());
  }

  nextOrderReference() {
    this.counters.order += 1;
    return `MP-${this.yymm()}-${this.counters.order}`;
  }

  nextRefundReference() {
    this.counters.refund += 1;
    return `RF-${this.yymm()}-${String(this.counters.refund).padStart(4, "0")}`;
  }

  nextTicketCode() {
    this.counters.ticket += 1;
    return `MP-${this.counters.ticket}`;
  }

  /* ---------- lookups ---------- */

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

  userByFanNumber(number: string) {
    return [...this.users.values()].find((u) => u.fanId.status === "approved" && digits(u.fanId.number) === number);
  }

  userByContact(contact: string) {
    const phone = digits(contact).replace(/^20(?=1)/, "");
    return [...this.users.values()].find((u) => u.phone === phone || (u.email && u.email.toLowerCase() === contact.trim().toLowerCase()));
  }

  /* ---------- users ---------- */

  /** Resolves time-based state (e.g. a Fan ID review finishing) before a user is read. */
  refreshUser(user: StoredUser) {
    if (user.fanId.status === "pending" && user.fanIdReviewAt !== undefined && !dayjs(this.now()).isBefore(user.fanIdReviewAt)) {
      let number: string;
      do number = `2210 4417 ${randomInt(1000, 10_000)}`;
      while (this.userByFanNumber(digits(number)));
      user.fanId = { status: "approved", number, validUntil: dayjs(this.now()).add(3, "year").format("MMM YYYY"), nameEn: user.fullName };
      user.fanIdReviewAt = undefined;
      const [first, last] = user.fullName.split(/\s+/);
      user.fans.unshift({
        id: this.id("fan"),
        name: last ? `${first} ${last[0]}. (you)` : `${first} (you)`,
        initials: user.initials,
        fanIdMasked: `Fan ID •••• ${number.slice(-4)}`,
        status: "approved",
        isSelf: true,
        number: digits(number),
      });
      this.notify(user.id, { kind: "fan_id", title: "Your Fan ID is approved", body: "You can now buy match tickets.", href: "/fan-id" });
    }
    return user;
  }

  toUser(user: StoredUser): User {
    const { phone: _p, password: _pw, fans, fanIdReviewAt: _r, usedPromos: _u, ...rest } = this.refreshUser(user);
    return { ...rest, linkedFans: fans.map(({ number: _n, ...fan }) => fan) };
  }

  selfFanNumber(user: StoredUser) {
    return user.fanId.status === "approved" ? digits(user.fanId.number) : undefined;
  }

  /* ---------- notifications ---------- */

  notify(userId: string, n: Omit<Notification, "id" | "createdAt" | "read">) {
    const id = this.id("ntf");
    this.notifications.set(id, { ...n, id, userId, createdAt: this.now().toISOString(), read: false });
  }

  /* ---------- holds ---------- */

  /** Drops holds whose 10-minute window has passed (unless an order is waiting on payment). */
  purgeExpiredHolds() {
    const now = dayjs(this.now());
    for (const [id, hold] of this.holds) {
      const awaiting = [...this.orders.values()].some((o) => o.holdId === id && o.status === "pending_payment");
      if (!awaiting && !now.isBefore(hold.expiresAt)) this.holds.delete(id);
    }
  }

  /** Seats other fans are holding right now — unavailable to everyone else. */
  heldByOthers(soldKey: string, userId?: string) {
    this.purgeExpiredHolds();
    const keys = new Set<string>();
    for (const hold of this.holds.values()) if (hold.soldKey === soldKey && hold.userId !== userId) hold.seatKeys.forEach((k) => keys.add(k));
    return keys;
  }

  unavailable(soldKey: string, userId?: string) {
    return new Set([...this.soldFor(soldKey), ...this.heldByOthers(soldKey, userId)]);
  }

  /* ---------- tickets ---------- */

  /** Time-dependent ticket fields, recomputed on every read. */
  timing(ticket: Pick<Ticket, "eventKind" | "startsAt">) {
    const start = ticket.startsAt;
    const hoursLeft = hoursUntil(start, this.now());
    const isMatch = ticket.eventKind === "match";
    const isCinema = ticket.eventKind === "cinema";
    const unlockAt = addHours(start, -24).toISOString();
    const refundable = isCinema ? hoursLeft > 2 : !isMatch && hoursLeft > 24 * 7;
    return {
      qrReady: isCinema || hoursLeft <= 24,
      qrUnlockLabel: `Appears ${dayLabel(unlockAt)} at ${timeLabel(unlockAt)}, 24 hours before ${isMatch ? "kick-off" : "gates open"}.`,
      progress: Math.max(0, Math.min(100, Math.round(100 - hoursLeft / 7.2))),
      refundable,
      refundNote: refundable
        ? isCinema
          ? "Refundable until 2 hours before showtime"
          : `Refundable until ${dayLabel(addHours(start, -24 * 7))}`
        : isMatch
          ? "Refund not available — sell on official resale instead"
          : "Refund window closed — sell on official resale instead",
    };
  }

  publicTicket(ticket: StoredTicket): Ticket {
    const { userId: _u, fanNumber: _f, ...rest } = ticket;
    return { ...rest, ...this.timing(ticket) };
  }

  issueTicket(
    userId: string,
    orderId: string,
    event: Pick<EventDetail, "id" | "slug" | "kind" | "layout" | "theme" | "tag" | "title" | "startsAt" | "gatesOpenAt" | "doorsAt" | "venue">,
    spec: TicketSpec,
    index: number,
    of: number,
  ): StoredTicket {
    const isMatch = event.kind === "match";
    const isCinema = event.kind === "cinema";
    const ticket: StoredTicket = {
      id: this.id("tkt"),
      code: this.nextTicketCode(),
      userId,
      fanNumber: spec.fanNumber,
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
      timeLabel: isMatch ? `Kick-off · gates open ${event.gatesOpenAt ?? ""}` : isCinema ? "Screen 4 · trailers 15 min" : `On stage · doors ${event.doorsAt ?? ""}`,
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
      progress: 0,
      qrReady: false,
      qrUnlockLabel: "",
      entryInfo: isMatch
        ? `Enter through Gate ${spec.fields.find((f) => f.key === "Gate")?.value ?? "7"}. Gate staff will check your face against your Fan ID. Parking P2 is closest.`
        : isCinema
          ? "Scan your QR at the Screen 4 entrance. Arrive 15 minutes early for trailers."
          : "Your entrance opens with the doors. Wristbands are handed out after your QR is scanned.",
      transferMode: isMatch ? "fan_id" : "contact",
      transferNote: isMatch
        ? "Matches: tickets can only go to an approved Fan ID. They must accept within 24 hours."
        : "Your friend gets a new QR; yours stops working once they accept.",
      refundable: false,
      refundNote: "",
      resaleAllowed: !isCinema,
    };
    Object.assign(ticket, this.timing(ticket));
    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  /** Fan ID numbers that already hold a live ticket for an event. */
  fanNumbersWithTickets(eventId: string) {
    const live = new Set<Ticket["status"]>(["valid", "listed", "refund_pending", "transfer_pending"]);
    return new Set([...this.tickets.values()].filter((t) => t.eventId === eventId && live.has(t.status) && t.fanNumber).map((t) => t.fanNumber!));
  }

  /* ---------- entry QR ---------- */

  signQr(ticketId: string, window: number) {
    const payload = Buffer.from(`${ticketId}.${window}`).toString("base64url");
    const sig = createHmac("sha256", this.options.qrSecret).update(payload).digest("base64url").slice(0, 32);
    return `MPQ1.${payload}.${sig}`;
  }

  qrWindow() {
    return Math.floor(dayjs(this.now()).unix() / QR_PERIOD_SECONDS);
  }

  verifyQr(token: string): { ok: true; ticketId: string } | { ok: false; reason: "expired" | "tampered" } {
    const [prefix, payload, sig] = token.split(".");
    if (prefix !== "MPQ1" || !payload || !sig) return { ok: false, reason: "tampered" };
    const expected = createHmac("sha256", this.options.qrSecret).update(payload).digest("base64url").slice(0, 32);
    if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { ok: false, reason: "tampered" };
    const [ticketId, window] = Buffer.from(payload, "base64url").toString().split(".");
    // Accept the current and the previous window to absorb clock skew at the gate.
    if (this.qrWindow() - Number(window) > 1) return { ok: false, reason: "expired" };
    return { ok: true, ticketId: ticketId ?? "" };
  }

  /* ---------- orders ---------- */

  /** Applies time-based payment outcomes: wallet/InstaPay approvals and unpaid orders expiring. */
  refreshOrder(order: StoredOrder) {
    const now = dayjs(this.now());
    if (order.status !== "pending_payment") return order;
    if (order.approveAt !== undefined && !now.isBefore(order.approveAt)) this.completePayment(order);
    else if (order.payment.expiresAt && now.isAfter(order.payment.expiresAt)) {
      order.status = "expired";
      this.holds.delete(order.holdId);
    }
    return order;
  }

  /** The provider confirmed payment (webhook): issue tickets and release nothing back to sale. */
  completePayment(order: StoredOrder) {
    if (order.fulfilled) return order;
    const hold = this.holds.get(order.holdId);
    const event = this.eventById(hold?.eventId ?? "");
    if (!hold || !event) {
      order.status = "expired";
      return order;
    }
    const tickets = hold.ticketSpecs.map((spec, i) => this.issueTicket(order.userId, order.id, event, spec, i + 1, hold.ticketSpecs.length));
    hold.seatKeys.forEach((key) => this.soldFor(hold.soldKey).add(key));
    if (hold.listingId) {
      const listing = this.listings.get(hold.listingId);
      if (listing) {
        listing.status = "sold";
        listing.detail = `${listing.price} EGP · paid out ${listing.payout.toFixed(2)}`;
        const sellerTicket = this.tickets.get(listing.ticketId);
        if (sellerTicket) sellerTicket.status = "resold";
        this.notify(listing.userId, { kind: "order", title: "Your resale ticket sold", body: `${listing.title} sold for ${listing.price} EGP.`, href: "/resale" });
      }
    }
    if (hold.promoCode) this.users.get(order.userId)?.usedPromos.push(hold.promoCode);
    order.status = "paid";
    order.fulfilled = true;
    order.tickets = tickets.map((t) => this.publicTicket(t));
    this.holds.delete(hold.id);
    this.notify(order.userId, { kind: "order", title: "You're going!", body: `${order.eventTitle} · order ${order.reference}`, href: `/orders/${order.id}` });
    return order;
  }

  failPayment(order: StoredOrder, reason: string) {
    order.status = "payment_failed";
    order.payment = { ...order.payment, failureReason: reason };
    return order;
  }

  publicOrder(order: StoredOrder): Order {
    this.refreshOrder(order);
    const { userId: _u, fulfilled: _f, approveAt: _a, ...rest } = order;
    return { ...rest, tickets: rest.tickets.map((t) => (this.tickets.get(t.id) ? this.publicTicket(this.tickets.get(t.id)!) : t)) };
  }

  /* ---------- transfers ---------- */

  refreshTransfer(transfer: StoredTransfer) {
    if (transfer.status === "pending" && dayjs(this.now()).isAfter(transfer.expiresAt)) {
      transfer.status = "expired";
      const ticket = this.tickets.get(transfer.ticketId);
      if (ticket?.status === "transfer_pending") ticket.status = "valid";
    }
    return transfer;
  }

  /* ---------- events ---------- */

  /** Cancels an event and refunds every live ticket in full (fees included) — the organiser's decision. */
  cancelEvent(event: EventDetail) {
    event.status = "cancelled";
    event.statusLabel = "Cancelled · refunded";
    const byOrder = new Map<string, StoredTicket[]>();
    for (const t of this.tickets.values()) {
      if (t.eventId !== event.id || !["valid", "listed", "refund_pending", "transfer_pending"].includes(t.status)) continue;
      byOrder.set(t.orderId, [...(byOrder.get(t.orderId) ?? []), t]);
    }
    for (const [orderId, tickets] of byOrder) {
      tickets.forEach((t) => (t.status = "refunded"));
      const userId = tickets[0]!.userId;
      const amount = tickets.reduce((sum, t) => sum + t.price + event.serviceFee, 0);
      for (const r of this.refunds.values()) if (r.orderId === orderId && r.status === "in_review") r.status = "cancelled";
      const refund: StoredRefund = {
        id: this.id("rf"),
        reference: this.nextRefundReference(),
        orderId,
        userId,
        ticketIds: tickets.map((t) => t.id),
        requestedLabel: "AUTOMATIC",
        eventTitle: event.title,
        detail: `Event cancelled · ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} · automatic refund`,
        amount,
        destination: "To your original payment method",
        status: "refunded",
        statusLabel: "Refunded",
        steps: [
          { label: "Requested", when: "Automatic", state: "done" },
          { label: "Reviewing", when: "Automatic", state: "done" },
          { label: "Approved", when: "Today", state: "done" },
          { label: "Money sent", when: "5–10 working days", state: "done" },
        ],
        note: `Refunded in full, including ${event.serviceFee * tickets.length} EGP service fees, because the event was cancelled.`,
        noteTone: "success",
        canCancel: false,
        secondaryAction: "Download refund receipt",
      };
      this.refunds.set(refund.id, refund);
      this.notify(userId, { kind: "event", title: `${event.title} has been cancelled`, body: "Your tickets were refunded in full, including fees.", href: "/refunds" });
    }
    for (const listing of this.listings.values()) if (listing.eventId === event.id && listing.status === "listed") this.listings.delete(listing.id);
  }
}

/* ---------- Seed ---------- */

function seed(store: Store) {
  const now = store.now();
  const omarId = "usr_omar";
  const youssefId = "usr_youssef";
  const fans: StoredFan[] = [
    { id: "fan_omar", name: "Omar K. (you)", initials: "OK", fanIdMasked: "Fan ID •••• 4821", status: "approved", isSelf: true, number: "221044174821" },
    { id: "fan_youssef", name: "Youssef A.", initials: "YA", fanIdMasked: "Fan ID •••• 1907", status: "approved", isSelf: false, number: "221044171907" },
    { id: "fan_mariam", name: "Mariam K.", initials: "MK", fanIdMasked: "Fan ID •••• 3350", status: "approved", isSelf: false, number: "221044173350" },
    { id: "fan_hassan", name: "Hassan M.", initials: "HM", fanIdMasked: "Fan ID under review — can’t buy yet", status: "under_review", isSelf: false },
  ];
  store.users.set(omarId, {
    id: omarId,
    fullName: "Omar Khaled",
    initials: "OK",
    phone: DEMO_USER.phone,
    phoneMasked: "+20 10•• ••• 482",
    email: "omar.k@mail.com",
    password: DEMO_USER.password,
    fanId: { status: "approved", number: "2210 4417 4821", validUntil: "Oct 2029", nameEn: "Omar Khaled" },
    fans,
    credit: 0,
    preferences: { sms: true, email: true, marketing: false },
    usedPromos: [],
  });
  store.users.set(youssefId, {
    id: youssefId,
    fullName: "Youssef Adel",
    initials: "YA",
    phone: SECOND_USER.phone,
    phoneMasked: "+20 10•• ••• 432",
    email: "youssef.a@mail.com",
    password: SECOND_USER.password,
    fanId: { status: "approved", number: "2210 4417 1907", validUntil: "Oct 2029", nameEn: "Youssef Adel" },
    fans: [{ id: "fan_youssef_self", name: "Youssef A. (you)", initials: "YA", fanIdMasked: "Fan ID •••• 1907", status: "approved", isSelf: true, number: "221044171907" }],
    credit: 0,
    preferences: { sms: true, email: false, marketing: false },
    usedPromos: [],
  });
  // A fan selling tickets on official resale.
  const sellerId = "usr_seller";
  store.users.set(sellerId, {
    id: sellerId,
    fullName: "Karim Nabil",
    initials: "KN",
    phone: "1155555555",
    phoneMasked: "+20 11•• ••• 555",
    password: "matchpass123",
    fanId: { status: "approved", number: "2210 4417 5555", validUntil: "Oct 2029", nameEn: "Karim Nabil" },
    fans: [{ id: "fan_karim", name: "Karim N. (you)", initials: "KN", fanIdMasked: "Fan ID •••• 5555", status: "approved", isSelf: true, number: "221044175555" }],
    credit: 0,
    preferences: { sms: true, email: true, marketing: false },
    usedPromos: [],
  });

  const event = (id: string) => store.eventById(id)!;

  const derby = event(EVENT_IDS.derby);
  seedOrder(store, omarId, derby, [
    matchSpec("Omar K.", "Fan ID •••• 4821 · bring your ID card", "W3", "L", 18, 250, "221044174821"),
    matchSpec("Youssef A.", "Fan ID •••• 1907 · bring your ID card", "W3", "L", 19, 250, "221044171907"),
  ]);
  store.soldFor(derby.id).add("W3-L-18").add("W3-L-19");

  const layla = event(EVENT_IDS.layla);
  seedOrder(store, omarId, layla, [1, 2].map((n) => gaSpec("Omar K.", "Golden", "Standing", "B", `${n} / 2`, layla.priceFrom * 2)));

  const film = event(EVENT_IDS.film);
  // Three hours from now, rounded up to the next quarter hour.
  const soon = dayjs(addHours(now, 3));
  const filmAt = soon.add((15 - (soon.minute() % 15)) % 15, "minute").second(0).millisecond(0).toISOString();
  seedOrder(store, omarId, { ...film, startsAt: filmAt }, [
    {
      holderName: "Omar K.",
      holderDetail: "Matchpass account",
      seatLabel: "Row F · Seat 7",
      price: 220,
      priceLabel: "220 EGP",
      fields: [
        { key: "Seat", value: "07" },
        { key: "Row", value: "F" },
        { key: "Screen", value: "4" },
        { key: "Format", value: "IMAX" },
      ],
    },
  ]);

  const jazz = event(EVENT_IDS.jazz);
  seedOrder(store, omarId, jazz, [
    {
      holderName: "Omar K.",
      holderDetail: "Matchpass account",
      seatLabel: "2-day pass · Entrance A",
      price: jazz.priceFrom,
      priceLabel: `${jazz.priceFrom} EGP`,
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
  const postponedOrder = seedOrder(store, omarId, postponed, [
    matchSpec("Omar K.", "Fan ID •••• 4821", "E2", "E", 22, 150, "221044174821"),
    matchSpec("Youssef A.", "Fan ID •••• 1907", "E2", "E", 23, 150, "221044171907"),
  ]);
  for (const t of postponedOrder.tickets) store.tickets.get(t.id)!.status = "refunded";
  const refundedTicket = store.publicTicket(store.tickets.get(postponedOrder.tickets[0]!.id)!);
  store.refunds.set("rf_postponed", {
    id: "rf_postponed",
    reference: "RF-2409-0077",
    orderId: postponedOrder.id,
    userId: omarId,
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
    refundedTicket: { ...refundedTicket, status: "refunded" },
  });

  store.refunds.set("rf_cinema_late", {
    id: "rf_cinema_late",
    reference: "RF-2409-0052",
    orderId: "ord_history_cinema",
    userId: omarId,
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

  store.listings.set("lst_canal_sold", {
    id: "lst_canal_sold",
    userId: omarId,
    eventId: EVENT_IDS.canalCup,
    ticketId: "tkt_history_canal",
    title: "Canal United vs Sinai Stars",
    seatLabel: "N2 · Row C · Seat 4",
    faceValue: 50,
    price: 50,
    payout: 47.5,
    status: "sold",
    detail: "50 EGP · paid out 47.50",
  });

  // Resale market: Karim sells two tickets for the sold-out match and one for the Philharmonic.
  const soldOut = event(EVENT_IDS.soldOut);
  const resaleOrder = seedOrder(store, sellerId, soldOut, [
    matchSpec("Karim N.", "Fan ID •••• 5555 · bring your ID card", "W2", "D", 7, 250, "221044175555"),
    matchSpec("Karim N.", "Fan ID •••• 5555 · bring your ID card", "E1", "F", 12, 150),
  ]);
  resaleOrder.tickets.forEach((t, i) => {
    const stored = store.tickets.get(t.id)!;
    stored.status = "listed";
    const price = i === 0 ? 240 : 150;
    store.listings.set(`lst_resale_${i + 1}`, {
      id: `lst_resale_${i + 1}`,
      userId: sellerId,
      eventId: soldOut.id,
      ticketId: t.id,
      title: `${soldOut.title} · ${stored.seatLabel}`,
      seatLabel: stored.seatLabel,
      faceValue: stored.price,
      price,
      payout: Math.round(price * 0.95 * 100) / 100,
      status: "listed",
      detail: `${price} EGP`,
    });
  });
  const phil = event(EVENT_IDS.philharmonic);
  const philOrder = seedOrder(store, sellerId, phil, [
    {
      holderName: "Karim N.",
      holderDetail: "Matchpass account",
      seatLabel: "Stalls · Row B · Seat 9",
      price: 600,
      priceLabel: "600 EGP",
      fields: [
        { key: "Seat", value: "9" },
        { key: "Row", value: "B" },
        { key: "Section", value: "Stalls" },
        { key: "Door", value: "1" },
      ],
    },
  ]);
  const philTicket = store.tickets.get(philOrder.tickets[0]!.id)!;
  philTicket.status = "listed";
  store.listings.set("lst_resale_3", {
    id: "lst_resale_3",
    userId: sellerId,
    eventId: phil.id,
    ticketId: philTicket.id,
    title: `${phil.title} · ${philTicket.seatLabel}`,
    seatLabel: philTicket.seatLabel,
    faceValue: 600,
    price: 550,
    payout: 522.5,
    status: "listed",
    detail: "550 EGP",
  });

  store.notify(omarId, {
    kind: "event",
    title: "Delta SC vs Red Sea FC has been postponed",
    body: "Your 2 tickets were refunded in full, including fees.",
    href: "/refunds",
  });
}

export function matchSpec(holder: string, detail: string, block: string, row: string, seat: number, price: number, fanNumber?: string): TicketSpec {
  const side = block[0];
  const gate = side === "W" ? "7" : side === "E" ? "10" : side === "N" ? "2" : side === "V" ? "5" : "13";
  return {
    holderName: holder,
    holderDetail: detail,
    seatLabel: `${block} · Row ${row} · Seat ${seat}`,
    price,
    priceLabel: `${price} EGP`,
    fanNumber,
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
    priceLabel: `${price} EGP`,
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
  const order: StoredOrder = {
    id: orderId,
    userId,
    holdId: store.id("hold"),
    reference: store.nextOrderReference(),
    status: "paid",
    payment: { method: "card" },
    fulfilled: true,
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
    tickets: tickets.map((t) => store.publicTicket(t)),
    nextSteps: [],
  };
  store.orders.set(orderId, order);
  return order;
}
