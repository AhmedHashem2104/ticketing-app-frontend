import {
  dayjs,
  initialsOf,
  permissionsByRole,
  type AuditEntry,
  type EntryScan,
  type EventDetail,
  type EventPerformance,
  type EventRequest,
  type Payout,
  type SalesPoint,
  type StaffRole,
  type StaffUser,
  type ZoneSales,
} from "@repo/contracts";
import { cairoDate } from "@repo/contracts";
import { EVENT_IDS } from "./catalog";
import type { Store, StoredUser } from "./store";

/* ---------- Staff accounts ---------- */

export type StoredStaff = Omit<StaffUser, "permissions"> & { password: string };

export const STAFF_PASSWORD = "matchpass-staff";

/** Seeded staff — one per role, plus a second organiser to prove organisers only see their own events. */
export const STAFF_ACCOUNTS = {
  admin: "admin@matchpass.app",
  operations: "ops@matchpass.app",
  organizer: "hany@nilefc.example",
  promoter: "dina@nilelive.example",
} as const;

export type Organizer = { id: string; name: string; logoUrl?: string };

export const ORGANIZERS: Organizer[] = [
  { id: "org_nile_fc", name: "Nile FC", logoUrl: "/images/teams/nfc.svg" },
  { id: "org_efa", name: "Egyptian Football Association" },
  { id: "org_nile_live", name: "Nile Live Productions" },
  { id: "org_cinemas", name: "Matchpass Cinemas" },
];

/** Who runs an event: Nile FC home matches, the league for other matches, the promoter for shows, the cinema chain for films. */
export function organizerOf(event: Pick<EventDetail, "kind" | "homeTeam">): Organizer {
  if (event.kind === "match") return ORGANIZERS[event.homeTeam?.name === "Nile FC" ? 0 : 1]!;
  if (event.kind === "cinema") return ORGANIZERS[3]!;
  return ORGANIZERS[2]!;
}

export function publicStaff(staff: StoredStaff): StaffUser {
  const { password: _p, ...rest } = staff;
  return { ...rest, permissions: [...permissionsByRole[staff.role]] };
}

/** Events a staff member may see: everything for admin and operations, their own for organisers. */
export function visibleEvents(store: Store, staff: StoredStaff) {
  return staff.role === "organizer" ? store.events.filter((e) => organizerOf(e).id === staff.organizerId) : store.events;
}

export function seedStaff(store: Store) {
  const people: [string, string, StaffRole, string, Organizer?][] = [
    ["stf_nadia", "Nadia Farouk", "admin", STAFF_ACCOUNTS.admin],
    ["stf_tarek", "Tarek Mansour", "operations", STAFF_ACCOUNTS.operations],
    ["stf_hany", "Hany Saleh", "organizer", STAFF_ACCOUNTS.organizer, ORGANIZERS[0]],
    ["stf_dina", "Dina Adel", "organizer", STAFF_ACCOUNTS.promoter, ORGANIZERS[2]],
  ];
  for (const [id, name, role, email, org] of people) {
    store.staff.set(id, {
      id,
      name,
      initials: initialsOf(name),
      email,
      role,
      password: STAFF_PASSWORD,
      avatarUrl: `/images/avatars/${name.split(" ")[0]!.toLowerCase()}.jpg`,
      ...(org ? { organizerId: org.id, organizerName: org.name } : {}),
    });
  }

  // Fans waiting for a manual Fan ID review (the automatic check flagged them).
  const now = store.now();
  const pending: [string, string, string, string, "national_id" | "passport", string, number, string[]][] = [
    ["usr_laila", "Laila Hassan", "1023456789", "ليلى حسن", "national_id", "laila", 0.94, []],
    ["usr_ahmed", "Ahmed Fathy", "1234567890", "أحمد فتحي", "national_id", "ahmed", 0.71, ["Photo slightly blurred"]],
    [
      "usr_salma",
      "Salma Nasser",
      "1534567891",
      "سلمى ناصر",
      "passport",
      "salma",
      0.58,
      ["Face match below threshold", "Passport from outside Egypt"],
    ],
  ];
  pending.forEach(([id, fullName, phone, nameAr, documentType, photo, matchScore, flags], i) => {
    const submittedAt = dayjs(now)
      .subtract(3 + i * 7, "hour")
      .toISOString();
    store.users.set(id, {
      id,
      fullName,
      initials: initialsOf(fullName),
      avatarUrl: `/images/avatars/${photo}.jpg`,
      phone,
      phoneMasked: `+20 ${phone.slice(0, 2)}•• ••• ${phone.slice(-3)}`,
      password: "matchpass123",
      fanId: { status: "pending", submittedAt },
      fans: [],
      credit: 0,
      preferences: { sms: true, email: false, marketing: false },
      usedPromos: [],
      fanIdSubmission: {
        documentType,
        nameEn: fullName,
        nameAr,
        idNumberMasked: documentType === "passport" ? "A •••• •• 21" : `2 9${i} •••• •••• ${10 + i}`,
        submittedAt,
        documentImageUrl: documentType === "passport" ? "/images/kyc/passport.svg" : "/images/kyc/national-id.svg",
        selfieImageUrl: `/images/avatars/${photo}.jpg`,
        matchScore,
        flags,
      },
    });
  });

  // An organiser request waiting for an admin.
  const request: EventRequest = {
    id: "req_desert_postpone",
    eventId: EVENT_IDS.desert,
    eventTitle: store.eventById(EVENT_IDS.desert)?.title ?? "",
    organizerName: ORGANIZERS[2]!.name,
    requestedBy: "Dina Adel",
    type: "postpone",
    reason: "The headline act's flight was moved — we need two extra weeks.",
    status: "pending",
    createdAt: dayjs(now).subtract(5, "hour").toISOString(),
  };
  store.eventRequests.set(request.id, request);

  store.audit.push(
    {
      id: "aud_1",
      at: dayjs(now).subtract(1, "day").toISOString(),
      actor: "Nadia Farouk",
      role: "admin",
      action: "Postponed event",
      target: store.eventById(EVENT_IDS.postponed)?.title ?? "",
      detail: "Security advice from the police — new date to follow.",
    },
    {
      id: "aud_2",
      at: dayjs(now).subtract(20, "hour").toISOString(),
      actor: "Tarek Mansour",
      role: "operations",
      action: "Rejected refund",
      target: "RF-2409-0052",
      detail: "Requested 40 minutes before the showtime.",
    },
  );
}

/* ---------- Audit ---------- */

export function audit(store: Store, staff: StoredStaff, action: string, target: string, detail?: string) {
  const entry: AuditEntry = {
    id: store.id("aud"),
    at: store.now().toISOString(),
    actor: staff.name,
    role: staff.role,
    action,
    target,
    ...(detail ? { detail } : {}),
  };
  store.audit.unshift(entry);
}

/* ---------- Sales model ---------- */

/** Deterministic 0–1 noise from a string, so the seeded history is stable between restarts. */
function noise(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Seats per zone or ticket type, by venue layout (the order matches each event's price table). */
const CAPACITY: Record<EventDetail["layout"], number[]> = {
  stadium: [600, 8_000, 9_000, 10_000, 2_400],
  arena: [4_000, 800, 1_500, 2_000, 120],
  hall: [200, 260, 300, 340],
  cinema: [180, 24],
};

/** How much of the house was sold before today, by sale status. */
const SOLD_SHARE: Record<EventDetail["status"], number> = {
  on_sale: 0.55,
  few_left: 0.9,
  presale: 0.18,
  queue: 0.32,
  sold_out: 1,
  coming_soon: 0,
  cancelled: 0.6,
  postponed: 0.7,
};

const HISTORY_DAYS = 14;

/** Tickets sold through Matchpass in this store (orders placed since the seed), per event. */
function liveTickets(store: Store, eventId: string) {
  return [...store.tickets.values()].filter((t) => t.eventId === eventId && !["refunded", "cancelled"].includes(t.status));
}

export function zoneSales(store: Store, event: EventDetail): ZoneSales[] {
  const capacities = CAPACITY[event.layout];
  const live = liveTickets(store, event.id);
  return event.priceTable.map((row, i) => {
    const capacity = capacities[i] ?? 100;
    const variation = 0.85 + noise(`${event.id}:${row.name}`) * 0.3;
    const baseline = Math.min(capacity, Math.round(capacity * SOLD_SHARE[event.status] * (event.status === "sold_out" ? 1 : variation)));
    const extra = live.filter((t) => t.priceLabel === `${row.price} EGP` || t.price === row.price).length;
    const sold = Math.min(capacity, baseline + extra);
    return { name: row.name, sold, capacity, price: row.price, revenue: sold * row.price };
  });
}

/** Daily sales for the last two weeks: the seeded history spread over the days, plus real orders on their day. */
export function salesHistory(store: Store, events: EventDetail[]): SalesPoint[] {
  const today = dayjs(store.now());
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => cairoDate(today.subtract(HISTORY_DAYS - 1 - i, "day")));
  const points = new Map(days.map((date) => [date, { date, revenue: 0, tickets: 0 }]));
  for (const event of events) {
    const zones = zoneSales(store, event);
    const live = liveTickets(store, event.id);
    const baselineTickets = zones.reduce((n, z) => n + z.sold, 0) - live.length;
    const baselineRevenue = zones.reduce((n, z) => n + z.revenue, 0) - live.reduce((n, t) => n + t.price, 0);
    if (baselineTickets <= 0) continue;
    // Sales build towards the event: later days weigh more, with some day-to-day noise.
    const weights = days.map((date, i) => (i + 4) * (0.6 + noise(`${event.id}:${date}`)));
    const total = weights.reduce((a, b) => a + b, 0);
    days.forEach((date, i) => {
      const point = points.get(date)!;
      point.tickets += Math.round((baselineTickets * weights[i]!) / total);
      point.revenue += Math.round((baselineRevenue * weights[i]!) / total);
    });
  }
  for (const order of store.orders.values()) {
    if (order.status !== "paid" || !events.some((e) => e.slug === order.eventSlug)) continue;
    const point = points.get(cairoDate(order.createdAt));
    if (!point) continue;
    point.tickets += order.tickets.length;
    point.revenue += order.tickets.reduce((n, t) => n + t.price, 0);
  }
  return [...points.values()];
}

export function checkedIn(store: Store, eventId: string) {
  return store.entryScans.filter((s) => s.eventId === eventId && s.result === "admitted").length;
}

export function performance(store: Store, event: EventDetail): EventPerformance {
  const zones = zoneSales(store, event);
  const org = organizerOf(event);
  return {
    eventId: event.id,
    slug: event.slug,
    title: event.title,
    ...(event.imageUrl ? { imageUrl: event.imageUrl } : {}),
    kind: event.kind,
    startsAt: event.startsAt,
    status: event.status,
    statusLabel: event.statusLabel,
    venue: `${event.venue.name}, ${event.venue.area}`,
    organizerId: org.id,
    organizerName: org.name,
    sold: zones.reduce((n, z) => n + z.sold, 0),
    capacity: zones.reduce((n, z) => n + z.capacity, 0),
    revenue: zones.reduce((n, z) => n + z.revenue, 0),
    checkedIn: checkedIn(store, event.id),
  };
}

/** Matchpass keeps 5% of ticket revenue; organisers get the rest, minus refunds. Service fees stay with Matchpass. */
export const COMMISSION_RATE = 0.05;

export function refundedFor(store: Store, eventIds: Set<string>) {
  let total = 0;
  for (const refund of store.refunds.values()) {
    if (refund.status !== "refunded") continue;
    const order = store.orders.get(refund.orderId);
    const event = order ? store.eventBySlug(order.eventSlug) : undefined;
    if (event && eventIds.has(event.id)) total += refund.amount;
  }
  return total;
}

export function payouts(store: Store, organizerIds: Set<string>): Payout[] {
  const today = dayjs(store.now()).startOf("day");
  const list: Payout[] = [];
  for (const org of ORGANIZERS.filter((o) => organizerIds.has(o.id))) {
    const events = store.events.filter((e) => organizerOf(e).id === org.id);
    const gross = events.reduce((n, e) => n + performance(store, e).revenue, 0);
    const refunds = refundedFor(store, new Set(events.map((e) => e.id)));
    // Weekly settlements: two paid weeks, then the current one, scheduled for next Monday.
    const shares = [0.22, 0.31, 0.47];
    shares.forEach((share, i) => {
      const weeksAgo = shares.length - 1 - i;
      const start = today
        .subtract(weeksAgo + 1, "week")
        .startOf("week")
        .add(1, "day");
      const end = start.add(6, "day");
      const weekGross = Math.round(gross * share);
      const weekRefunds = i === shares.length - 1 ? refunds : 0;
      const fees = Math.round(weekGross * COMMISSION_RATE);
      const paid = weeksAgo > 0;
      list.push({
        id: `pay_${org.id}_${i}`,
        organizerId: org.id,
        organizerName: org.name,
        period: `${start.format("D MMM")} – ${end.format("D MMM")}`,
        gross: weekGross,
        fees,
        refunds: weekRefunds,
        net: Math.max(0, weekGross - fees - weekRefunds),
        status: paid ? "paid" : "scheduled",
        statusLabel: paid ? "Paid" : "Scheduled",
        payDate: end.add(1, "day").format("YYYY-MM-DD"),
      });
    });
  }
  return list.sort((a, b) => b.payDate.localeCompare(a.payDate));
}

/* ---------- Entry ---------- */

export type StoredScan = EntryScan & { eventId: string; ticketId?: string };

export const scanResultLabels: Record<EntryScan["result"], string> = {
  admitted: "Admitted",
  already_used: "Already used",
  expired: "QR expired — ask for a fresh one",
  invalid: "Not a Matchpass ticket",
  not_valid: "Ticket isn't valid",
};

export type FanIdSubmission = NonNullable<StoredUser["fanIdSubmission"]>;
