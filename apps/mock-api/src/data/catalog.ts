import type { City, EventDetail, EventKind, PriceRow, SaleStatus, Team, Theme, VenueLayout } from "@repo/contracts";
import { dayjs } from "@repo/contracts";
import { addHours, cairoDateTime, dayLabel, longDayLabel, timeLabel } from "./time";

const statusLabels: Record<SaleStatus, string> = {
  on_sale: "On sale",
  few_left: "Few left",
  presale: "Presale",
  queue: "Queue opens soon",
  sold_out: "Sold out · resale",
  coming_soon: "Coming soon",
  cancelled: "Cancelled",
  postponed: "Postponed",
};

const round5 = (n: number) => Math.round(n / 5) * 5;

/** Stadium zone prices derived from the cheapest (Category 3) ticket. */
export const stadiumPrices = (from: number) => ({ cat3: from, cat2: from * 2, cat1: round5((from * 10) / 3), vip: from * 8 });

const MATCH_FAQS = [
  {
    question: "How does the waiting room work?",
    answer:
      "Join before sales open. At opening time everyone inside gets a random place in line, so arriving early doesn't matter — just be there before it opens.",
  },
  {
    question: "Can I give my ticket to someone else?",
    answer: "Yes, to another approved Fan ID in the app, or sell it at face value on official resale.",
  },
  {
    question: "When do I get the QR code?",
    answer: "It appears in My tickets 24 hours before kick-off and refreshes every 30 seconds.",
  },
];

const SHOW_FAQS = [
  { question: "Can I transfer my ticket to a friend?", answer: "Yes. Send it from My tickets using their phone number or email." },
  { question: "Do I need a Fan ID for concerts?", answer: "No. A verified Matchpass account is enough for this event." },
];

type MatchSeed = {
  id: string;
  slug: string;
  category: string;
  tag: string;
  home: Team;
  away: Team;
  day: number;
  time: string;
  venue: { name: string; area: string; city: City };
  priceFrom: number;
  status: SaleStatus;
  statusLabel?: string;
  theme?: Theme;
  queueEnabled?: boolean;
};

function match(seed: MatchSeed, now: Date): EventDetail {
  const startsAt = cairoDateTime(seed.day, seed.time, now);
  const gates = timeLabel(addHours(startsAt, -2));
  const p = stadiumPrices(seed.priceFrom);
  const priceTable: PriceRow[] = [
    { name: "VIP lounge", where: "West upper tier", price: p.vip, availability: "few_left", availabilityLabel: "Few left" },
    { name: "Category 1", where: "West stand", price: p.cat1, availability: "available", availabilityLabel: "Available" },
    { name: "Category 2", where: "East stand", price: p.cat2, availability: "available", availabilityLabel: "Available" },
    { name: "Category 3", where: "North curve", price: p.cat3, availability: "high_demand", availabilityLabel: "High demand" },
    {
      name: "Away fans",
      where: "South curve",
      price: p.cat3,
      availability: "restricted",
      availabilityLabel: `${seed.away.name} fans only`,
    },
  ];
  return {
    id: seed.id,
    slug: seed.slug,
    kind: "match",
    layout: "stadium",
    category: seed.category,
    title: `${seed.home.name} vs ${seed.away.name}`,
    tag: seed.tag,
    art: `${seed.home.name.split(" ")[0]} v ${seed.away.name.split(" ")[0]}`,
    theme: seed.theme ?? "pitch",
    startsAt,
    venue: seed.venue,
    priceFrom: seed.priceFrom,
    status: seed.status,
    statusLabel: seed.statusLabel ?? statusLabels[seed.status],
    requiresFanId: true,
    maxPerOrder: 4,
    serviceFee: 15,
    homeTeam: seed.home,
    awayTeam: seed.away,
    headline: `${longDayLabel(startsAt)} · Kick-off ${seed.time} · Gates open ${gates} · ${seed.venue.name}, ${seed.venue.area}`,
    description: `${seed.tag}. ${seed.home.name} host ${seed.away.name} at ${seed.venue.name}.`,
    gatesOpenAt: gates,
    badges: ["Fan ID required", "Max 4 tickets per order", "Separate home & away zones"],
    priceTable,
    priceNote: "A 15 EGP service fee per ticket is added at checkout.",
    gates: [
      { gates: "Gates 1–4", area: "North curve" },
      { gates: "Gates 5–8", area: "West stand & VIP" },
      { gates: "Gates 9–12", area: "East stand" },
      { gates: "Gates 13–14", area: "South curve (away fans, separate entrance road)" },
    ],
    gatesNote: "Parking P2 and P3 open 3½ hours before kick-off. Shuttle buses from the metro station run every 10 minutes.",
    rulesTitle: "Before you buy",
    rules: [
      "Every ticket is tied to an approved Fan ID. Bring the ID card you registered with.",
      "One ticket per Fan ID. Buy for up to 3 linked family members or friends.",
      "Not allowed: flares, fireworks, glass bottles, laser pens, unapproved banners.",
      "If the match is played without fans or cancelled, you get a full refund automatically.",
    ],
    faqs: MATCH_FAQS,
    queueEnabled: seed.queueEnabled ?? false,
    presaleCodeEnabled: false,
    ...(seed.queueEnabled ? { saleOpensAt: dayjs(now).add(2, "day").add(4, "hour").add(12, "minute").add(36, "second").toISOString() } : {}),
  };
}

type ShowSeed = {
  id: string;
  slug: string;
  kind: Exclude<EventKind, "match">;
  layout: VenueLayout;
  category: string;
  tag: string;
  title: string;
  subtitle?: string;
  art: string;
  day: number;
  time: string;
  doors?: string;
  endDay?: number;
  venue: { name: string; area: string; city: City };
  priceFrom: number;
  status: SaleStatus;
  theme?: Theme;
  scarcityNote?: string;
  presale?: boolean;
  description?: string;
};

function show(seed: ShowSeed, now: Date): EventDetail {
  const startsAt = cairoDateTime(seed.day, seed.time, now);
  const isCinema = seed.kind === "cinema";
  const doors = seed.doors ?? timeLabel(addHours(startsAt, -1));
  const priceTable: PriceRow[] =
    seed.layout === "arena"
      ? arenaPriceTable(seed.priceFrom)
      : seed.layout === "hall"
        ? hallPriceTable(seed.priceFrom)
        : [
            { name: "Standard", where: "Rows A–I", price: seed.priceFrom, availability: "available", availabilityLabel: "Available" },
            { name: "VIP recliner", where: "Row J", price: seed.priceFrom * 2, availability: "few_left", availabilityLabel: "Few left" },
          ];
  return {
    id: seed.id,
    slug: seed.slug,
    kind: seed.kind,
    layout: seed.layout,
    category: seed.category,
    title: seed.title,
    ...(seed.subtitle ? { subtitle: seed.subtitle } : {}),
    tag: seed.tag,
    art: seed.art,
    theme: seed.theme ?? "plum",
    startsAt,
    ...(seed.endDay !== undefined ? { endsAt: cairoDateTime(seed.endDay, "23:00", now) } : {}),
    venue: seed.venue,
    priceFrom: seed.priceFrom,
    status: seed.status,
    statusLabel: statusLabels[seed.status],
    requiresFanId: false,
    maxPerOrder: isCinema ? 10 : 8,
    serviceFee: isCinema ? 10 : 25,
    headline: `${dayLabel(startsAt)} · Doors ${doors} · ${seed.venue.name}, ${seed.venue.area}`,
    description:
      seed.description ??
      `${seed.title} comes to ${seed.venue.name} for one night only — expect the hits, a few surprises and a full production.`,
    doorsAt: doors,
    badges: [],
    priceTable,
    priceNote: `Max ${isCinema ? 10 : 8} tickets per order · ${isCinema ? 10 : 25} EGP service fee per ticket`,
    rulesTitle: "Good to know",
    rules: isCinema
      ? ["Tickets are in the Matchpass app — QR appears straight away.", "Refunds up to 2 hours before the showtime."]
      : [
          "Tickets are in the Matchpass app — QR appears 24 hours before doors.",
          "Small bags only; no professional cameras or recording equipment.",
          "Step-free access and accessible viewing platform at Entrance C.",
          "Refunds only if the show is cancelled or moved. You can resell on official resale.",
        ],
    faqs: SHOW_FAQS,
    runningOrder: [
      { time: doors, label: "Doors open" },
      { time: seed.time, label: seed.subtitle?.replace(/^with (special guests )?/, "") ?? "Support act" },
      {
        time: timeLabel(addHours(startsAt, 1.25)),
        label: seed.title.split(" — ")[0] ?? seed.title,
        headline: true,
      },
      { time: timeLabel(addHours(startsAt, 3.25)), label: "Show ends" },
    ],
    facts: [
      { label: "DATE", value: longDayLabel(startsAt).split(" ").slice(0, 3).join(" ") },
      { label: "DOORS · SHOW", value: `${doors} · ${seed.time}` },
      { label: "VENUE", value: `${seed.venue.name}, ${seed.venue.area}` },
      { label: "AGE", value: "All ages · under 12 with an adult" },
    ],
    promoter: "Nile Live Productions",
    ...(seed.scarcityNote ? { scarcityNote: seed.scarcityNote } : {}),
    queueEnabled: false,
    presaleCodeEnabled: seed.presale ?? false,
  };
}

const round50 = (n: number) => Math.round(n / 50) * 50;

/** Arena ticket type prices derived from general admission. */
export const arenaPrices = (ga: number) => ({
  ga,
  gc: ga * 2,
  sa: round50(ga * 2.667),
  sb: round50(ga * 1.556),
  vip: round50(ga * 5.556),
});

function arenaPriceTable(ga: number): PriceRow[] {
  const p = arenaPrices(ga);
  return [
    { name: "General admission", where: "Standing, main floor", price: p.ga, availability: "available", availabilityLabel: "Available" },
    {
      name: "Golden Circle",
      where: "Standing, closest to the stage",
      price: p.gc,
      availability: "few_left",
      availabilityLabel: "Few left",
    },
    { name: "Seated A", where: "Side tiers, numbered seat", price: p.sa, availability: "available", availabilityLabel: "Available" },
    { name: "Seated B", where: "Rear tier, numbered seat", price: p.sb, availability: "available", availabilityLabel: "Available" },
    {
      name: "VIP package",
      where: "Box seat, lounge, fast-track entry, merch pack",
      price: p.vip,
      availability: "few_left",
      availabilityLabel: "6 left",
    },
  ];
}

export const hallPrices = (balcony: number) => ({ A: balcony * 4, B: balcony * 3, C: balcony * 2, D: balcony });

function hallPriceTable(balcony: number): PriceRow[] {
  const p = hallPrices(balcony);
  return [
    { name: "Category A", where: "Stalls rows A–D", price: p.A, availability: "few_left", availabilityLabel: "Few left" },
    { name: "Category B", where: "Stalls rows E–H", price: p.B, availability: "available", availabilityLabel: "Available" },
    { name: "Category C", where: "Stalls rows I–L", price: p.C, availability: "available", availabilityLabel: "Available" },
    { name: "Balcony", where: "Rows M–Q", price: p.D, availability: "available", availabilityLabel: "Available" },
  ];
}

const teams = {
  nile: { name: "Nile FC", short: "NFC" },
  delta: { name: "Delta SC", short: "DSC" },
  canal: { name: "Canal United", short: "CU" },
  sinai: { name: "Sinai Stars", short: "SS" },
  alex: { name: "Alex Port FC", short: "APF" },
  upper: { name: "Upper Egypt SC", short: "UES" },
  redSea: { name: "Red Sea FC", short: "RSF" },
  egypt: { name: "Egypt", short: "EGY" },
  morocco: { name: "Morocco", short: "MAR" },
} satisfies Record<string, Team>;

const venues = {
  capital: { name: "Capital Stadium", area: "Cairo", city: "cairo" },
  canal: { name: "Canal Stadium", area: "Ismailia", city: "canal" },
  seafront: { name: "Seafront Stadium", area: "Alexandria", city: "alexandria" },
  deltaStadium: { name: "Delta Stadium", area: "Mansoura", city: "delta" },
  nileArena: { name: "Nile Arena", area: "New Cairo", city: "cairo" },
  garden: { name: "Garden Stage", area: "Zamalek", city: "cairo" },
  amphitheatre: { name: "Old Town Amphitheatre", area: "Cairo", city: "cairo" },
  downtown: { name: "Downtown Theatre", area: "Cairo", city: "cairo" },
  redSeaShore: { name: "Red Sea Shore", area: "Hurghada", city: "red_sea" },
  opera: { name: "Opera Hall", area: "Cairo", city: "cairo" },
  cinema: { name: "Matchpass Cinemas · City Mall", area: "New Cairo", city: "cairo" },
} satisfies Record<string, { name: string; area: string; city: City }>;

export const EVENT_IDS = {
  derby: "evt_nile_delta",
  canalCup: "evt_canal_sinai",
  alex: "evt_alex_upper",
  postponed: "evt_delta_redsea",
  soldOut: "evt_nile_canal",
  national: "evt_egypt_morocco",
  layla: "evt_layla_nour",
  jazz: "evt_cairo_jazz",
  felucca: "evt_felucca_band",
  comedy: "evt_omar_sami",
  desert: "evt_desert_beats",
  philharmonic: "evt_nile_philharmonic",
  film: "evt_last_lighthouse",
  film2: "evt_zamalek_nights",
} as const;

export function buildCatalog(now: Date): EventDetail[] {
  return [
    match(
      {
        id: EVENT_IDS.derby,
        slug: "nile-fc-vs-delta-sc",
        category: "Premier League",
        tag: "Premier League · Matchday 12",
        home: teams.nile,
        away: teams.delta,
        day: 17,
        time: "20:00",
        venue: venues.capital,
        priceFrom: 75,
        status: "queue",
        statusLabel: "Waiting room open",
        queueEnabled: true,
      },
      now,
    ),
    match(
      {
        id: EVENT_IDS.canalCup,
        slug: "canal-united-vs-sinai-stars",
        category: "Cup",
        tag: "Cup · Round of 16",
        home: teams.canal,
        away: teams.sinai,
        day: 20,
        time: "17:00",
        venue: venues.canal,
        priceFrom: 50,
        status: "on_sale",
      },
      now,
    ),
    match(
      {
        id: EVENT_IDS.alex,
        slug: "alex-port-fc-vs-upper-egypt-sc",
        category: "Premier League",
        tag: "Premier League · Matchday 13",
        home: teams.alex,
        away: teams.upper,
        day: 23,
        time: "19:00",
        venue: venues.seafront,
        priceFrom: 40,
        status: "on_sale",
        theme: "forest",
      },
      now,
    ),
    match(
      {
        id: EVENT_IDS.postponed,
        slug: "delta-sc-vs-red-sea-fc",
        category: "Premier League",
        tag: "Premier League · Matchday 13",
        home: teams.delta,
        away: teams.redSea,
        day: 25,
        time: "20:00",
        venue: venues.deltaStadium,
        priceFrom: 40,
        status: "few_left",
      },
      now,
    ),
    match(
      {
        id: EVENT_IDS.soldOut,
        slug: "nile-fc-vs-canal-united",
        category: "Premier League",
        tag: "Premier League · Matchday 14",
        home: teams.nile,
        away: teams.canal,
        day: 31,
        time: "18:00",
        venue: venues.capital,
        priceFrom: 75,
        status: "sold_out",
      },
      now,
    ),
    match(
      {
        id: EVENT_IDS.national,
        slug: "egypt-vs-morocco",
        category: "National team",
        tag: "National team · Qualifier",
        home: teams.egypt,
        away: teams.morocco,
        day: 44,
        time: "21:00",
        venue: venues.capital,
        priceFrom: 100,
        status: "coming_soon",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.layla,
        slug: "layla-nour-live-in-cairo",
        kind: "concert",
        layout: "arena",
        category: "Concerts",
        tag: "Concert · Pop",
        title: "Layla Nour — Live in Cairo",
        subtitle: "with special guests The Felucca Band",
        art: "Layla Nour Live",
        day: 29,
        time: "20:00",
        doors: "19:00",
        venue: venues.nileArena,
        priceFrom: 450,
        status: "few_left",
        scarcityNote: "Golden Circle: few left",
        presale: true,
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.jazz,
        slug: "cairo-jazz-nights",
        kind: "festival",
        layout: "arena",
        category: "Festivals",
        tag: "Festival · Jazz · 2 days",
        title: "Cairo Jazz Nights",
        art: "Cairo Jazz Nights",
        day: 37,
        endDay: 38,
        time: "18:00",
        venue: venues.garden,
        priceFrom: 300,
        status: "presale",
        theme: "violet",
        presale: true,
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.felucca,
        slug: "the-felucca-band",
        kind: "concert",
        layout: "arena",
        category: "Concerts",
        tag: "Concert · Indie",
        title: "The Felucca Band",
        art: "The Felucca Band",
        day: 45,
        time: "20:30",
        venue: venues.amphitheatre,
        priceFrom: 250,
        status: "on_sale",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.comedy,
        slug: "omar-sami-stand-up",
        kind: "comedy",
        layout: "hall",
        category: "Comedy",
        tag: "Comedy · Stand-up",
        title: "Omar Sami — Stand-up",
        art: "Omar Sami",
        day: 50,
        time: "21:00",
        venue: venues.downtown,
        priceFrom: 200,
        status: "on_sale",
        theme: "violet",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.desert,
        slug: "desert-beats-festival",
        kind: "festival",
        layout: "arena",
        category: "Festivals",
        tag: "Festival · Electronic",
        title: "Desert Beats Festival",
        art: "Desert Beats",
        day: 58,
        time: "16:00",
        venue: venues.redSeaShore,
        priceFrom: 900,
        status: "coming_soon",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.philharmonic,
        slug: "nile-philharmonic-film-classics",
        kind: "classical",
        layout: "hall",
        category: "Classical",
        tag: "Classical · One night",
        title: "Nile Philharmonic: Film Classics",
        art: "Film Classics",
        day: 66,
        time: "20:00",
        venue: venues.opera,
        priceFrom: 150,
        status: "few_left",
        theme: "violet",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.film,
        slug: "the-last-lighthouse",
        kind: "cinema",
        layout: "cinema",
        category: "Cinema",
        tag: "Drama · 2h 08m · PG-13 · Arabic subtitles",
        title: "The Last Lighthouse",
        art: "The Last Lighthouse",
        day: 0,
        time: "21:45",
        venue: venues.cinema,
        priceFrom: 150,
        status: "on_sale",
        theme: "ink",
        description: "A keeper on a remote Red Sea island receives one last ship. Screen 4 · Arabic subtitles.",
      },
      now,
    ),
    show(
      {
        id: EVENT_IDS.film2,
        slug: "zamalek-nights",
        kind: "cinema",
        layout: "cinema",
        category: "Cinema",
        tag: "Comedy · 1h 52m · PG · English subtitles",
        title: "Zamalek Nights",
        art: "Zamalek Nights",
        day: 0,
        time: "19:30",
        venue: venues.cinema,
        priceFrom: 150,
        status: "on_sale",
        theme: "plum",
        description: "Three friends, one rooftop and the longest night of Ramadan. Screen 4 · English subtitles.",
      },
      now,
    ),
  ];
}

export const HOME_LAYOUT = {
  featured: [EVENT_IDS.derby, EVENT_IDS.layla],
  onSale: [EVENT_IDS.canalCup, EVENT_IDS.layla, EVENT_IDS.jazz, EVENT_IDS.alex],
  comingSoon: [EVENT_IDS.national, EVENT_IDS.desert, EVENT_IDS.philharmonic],
  categories: ["All", "Premier League", "Cup", "National team", "Concerts", "Festivals", "Comedy", "Classical"],
};
