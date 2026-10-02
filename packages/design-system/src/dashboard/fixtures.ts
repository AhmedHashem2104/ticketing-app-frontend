import {
  permissionsByRole,
  type AuditEntry,
  type EntrySummary,
  type EventPerformance,
  type EventReport,
  type EventRequest,
  type FanAccountRow,
  type FanIdReview,
  type OrganizerRow,
  type Overview,
  type Payout,
  type RefundReview,
  type StaffOrderRow,
  type StaffRole,
  type StaffUser,
} from "@repo/contracts";

/** Sample dashboard data for stories and tests — shaped like the mock API's `/api/staff/*` responses. */

export const staffUsers: Record<StaffRole, StaffUser> = {
  admin: {
    id: "stf_nadia",
    name: "Nadia Farouk",
    initials: "NF",
    email: "admin@matchpass.app",
    role: "admin",
    avatarUrl: "/images/avatars/nadia.jpg",
    permissions: [...permissionsByRole.admin],
  },
  operations: {
    id: "stf_tarek",
    name: "Tarek Mansour",
    initials: "TM",
    email: "ops@matchpass.app",
    role: "operations",
    permissions: [...permissionsByRole.operations],
  },
  organizer: {
    id: "stf_hany",
    name: "Hany Saleh",
    initials: "HS",
    email: "hany@nilefc.example",
    role: "organizer",
    organizerId: "org_nile_fc",
    organizerName: "Nile FC",
    permissions: [...permissionsByRole.organizer],
  },
};

const day = (offset: number) => {
  const d = new Date(Date.UTC(2026, 9, 3 - offset));
  return d.toISOString().slice(0, 10);
};

export const salesSeries = Array.from({ length: 14 }, (_, i) => {
  const tickets = [42, 55, 38, 61, 90, 120, 74, 58, 66, 49, 101, 133, 88, 72][i]!;
  return { date: day(13 - i), tickets, revenue: tickets * 385 };
});

export const eventRows: EventPerformance[] = [
  {
    eventId: "evt_derby",
    slug: "nile-fc-vs-delta-sc",
    title: "Nile FC vs Delta SC",
    imageUrl: "/images/events/derby.jpg",
    kind: "match",
    startsAt: "2026-10-18T18:00:00.000Z",
    status: "on_sale",
    statusLabel: "On sale",
    venue: "Cairo International Stadium",
    organizerId: "org_nile_fc",
    organizerName: "Nile FC",
    sold: 41250,
    capacity: 60000,
    revenue: 9_281_250,
    checkedIn: 0,
  },
  {
    eventId: "evt_layla",
    slug: "layla-nour-live-in-cairo",
    title: "Layla Nour — Live in Cairo",
    kind: "concert",
    startsAt: "2026-11-06T19:00:00.000Z",
    status: "sold_out",
    statusLabel: "Sold out",
    venue: "Cairo Opera House",
    organizerId: "org_nile_live",
    organizerName: "Nile Live Productions",
    sold: 1200,
    capacity: 1200,
    revenue: 1_440_000,
    checkedIn: 0,
  },
];

export const overviewSample: Overview = {
  kpis: [
    { id: "revenue", label: "Ticket revenue", value: 12_480_500, format: "money", change: 0.12, hint: "All events, before fees" },
    { id: "tickets", label: "Tickets sold", value: 58_210, format: "number", change: -0.04 },
    { id: "fanid_queue", label: "Fan IDs to review", value: 3, format: "number" },
  ],
  sales: salesSeries,
  topEvents: eventRows,
  tasks: [
    { id: "fanid", label: "Fan IDs waiting for review", count: 3, href: "/fan-ids" },
    { id: "refunds", label: "Refund requests to decide", count: 0, href: "/refunds" },
  ],
};

export const eventReportSample: EventReport = {
  ...eventRows[0]!,
  zones: [
    { name: "Category 1", sold: 9800, capacity: 12000, price: 350, revenue: 3_430_000 },
    { name: "Category 2", sold: 21000, capacity: 30000, price: 200, revenue: 4_200_000 },
    { name: "VIP", sold: 450, capacity: 500, price: 1500, revenue: 675_000 },
  ],
  sales: salesSeries,
  resale: { listed: 120, sold: 64 },
  refunds: { requested: 18, refunded: 5200 },
  fees: 1_237_500,
  net: 8_812_000,
};

export const fanIdReviews: FanIdReview[] = [
  {
    userId: "usr_salma",
    fullName: "Salma Nasser",
    initials: "SN",
    phoneMasked: "+20 15 •••• 7891",
    submittedAt: "2026-10-01T09:12:00.000Z",
    documentType: "passport",
    nameEn: "Salma Nasser",
    nameAr: "سلمى ناصر",
    idNumberMasked: "A •••• •• 21",
    documentImageUrl: "/images/kyc/passport.svg",
    selfieImageUrl: "/images/avatars/salma.jpg",
    matchScore: 0.58,
    flags: ["Face match below threshold", "Passport from outside Egypt"],
  },
];

export const refundReviews: RefundReview[] = [
  {
    id: "rf_1",
    reference: "RF-20481",
    customer: "Omar Khaled",
    eventTitle: "Nile FC vs Delta SC",
    detail: "2 tickets · Category 1",
    reason: "Can't attend",
    amount: 700,
    destination: "Matchpass credit (+10%)",
    status: "in_review",
    statusLabel: "In review",
    requestedAt: "2026-10-02T15:40:00.000Z",
  },
];

export const orderRows: StaffOrderRow[] = [
  {
    id: "ord_1",
    reference: "MP-48213",
    customer: "Omar Khaled",
    phoneMasked: "+20 10 •••• 5482",
    eventTitle: "Nile FC vs Delta SC",
    eventId: "evt_derby",
    tickets: 2,
    total: 760,
    method: "card",
    status: "paid",
    statusLabel: "Paid",
    createdAt: "2026-10-02T12:00:00.000Z",
  },
  {
    id: "ord_2",
    reference: "MP-48214",
    customer: "Mariam Adel",
    phoneMasked: "+20 11 •••• 1907",
    eventTitle: "Layla Nour — Live in Cairo",
    eventId: "evt_layla",
    tickets: 1,
    total: 1250,
    method: "fawry",
    status: "pending_payment",
    statusLabel: "Waiting for payment",
    createdAt: "2026-10-03T08:00:00.000Z",
  },
];

export const fanRows: FanAccountRow[] = [
  {
    id: "usr_omar",
    fullName: "Omar Khaled",
    initials: "OK",
    phoneMasked: "+20 10 •••• 5482",
    fanIdStatus: "approved",
    orders: 6,
    tickets: 11,
    spent: 4_120,
    suspended: false,
  },
  {
    id: "usr_ahmed",
    fullName: "Ahmed Fathy",
    initials: "AF",
    phoneMasked: "+20 12 •••• 7890",
    fanIdStatus: "pending",
    orders: 0,
    tickets: 0,
    spent: 0,
    suspended: true,
  },
];

export const requestRows: EventRequest[] = [
  {
    id: "req_1",
    eventId: "evt_felucca",
    eventTitle: "Felucca Nights",
    organizerName: "Nile Live Productions",
    requestedBy: "Dina Adel",
    type: "postpone",
    reason: "The headline act's flight was moved — we need two extra weeks.",
    status: "pending",
    createdAt: "2026-10-02T10:00:00.000Z",
  },
  {
    id: "req_2",
    eventId: "evt_desert",
    eventTitle: "Desert Beats",
    organizerName: "Nile Live Productions",
    requestedBy: "Dina Adel",
    type: "cancel",
    reason: "Low sales.",
    status: "rejected",
    createdAt: "2026-09-28T10:00:00.000Z",
    decidedBy: "Nadia Farouk",
    decisionNote: "Let's give it two more weeks.",
  },
];

export const organizerRows: OrganizerRow[] = [
  {
    id: "org_nile_fc",
    name: "Nile FC",
    logoUrl: "/images/teams/nfc.svg",
    events: 4,
    ticketsSold: 98_000,
    revenue: 21_400_000,
    payoutDue: 1_250_000,
  },
];

export const payoutRows: Payout[] = [
  {
    id: "po_1",
    organizerId: "org_nile_fc",
    organizerName: "Nile FC",
    period: "21 Sep – 27 Sep",
    gross: 1_400_000,
    fees: 70_000,
    refunds: 3_500,
    net: 1_326_500,
    status: "scheduled",
    statusLabel: "Scheduled",
    payDate: "2026-10-06",
  },
  {
    id: "po_2",
    organizerId: "org_nile_fc",
    organizerName: "Nile FC",
    period: "14 Sep – 20 Sep",
    gross: 900_000,
    fees: 45_000,
    refunds: 0,
    net: 855_000,
    status: "paid",
    statusLabel: "Paid",
    payDate: "2026-09-29",
  },
];

export const auditRows: AuditEntry[] = [
  {
    id: "aud_1",
    at: "2026-10-02T11:00:00.000Z",
    actor: "Nadia Farouk",
    role: "admin",
    action: "Postponed event",
    target: "Desert Beats",
    detail: "Security advice from the police — new date to follow.",
  },
];

export const entrySample: EntrySummary = {
  eventId: "evt_cinema",
  eventTitle: "Dune: Part Three",
  sold: 180,
  checkedIn: 42,
  gates: [
    { gate: "Gate 1", checkedIn: 30 },
    { gate: "Gate 2", checkedIn: 12 },
  ],
  recent: [
    {
      id: "scn_1",
      at: "2026-10-03T17:42:00.000Z",
      ticketCode: "MP-T-88213",
      holderName: "Omar Khaled",
      gate: "Gate 1",
      result: "admitted",
      resultLabel: "Admitted",
    },
  ],
};
