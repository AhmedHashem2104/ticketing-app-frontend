import type {
  ArenaSeatMap,
  CinemaSeatMap,
  CinemaSeats,
  EventDetail,
  HallSeatMap,
  SeatMap,
  Showtime,
  StadiumBlock,
  StadiumSeatMap,
  StadiumSide,
  Zone,
} from "@repo/contracts";
import { arenaPrices, hallPrices, stadiumPrices } from "./catalog";
import { cairoDate, cairoDateTime, weekdayShort } from "./time";

/** Deterministic pseudo-random in [0, 1) — the same seat is always sold in every run. */
export const rnd = (a: number, b: number, c = 0) => {
  const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return x - Math.floor(x);
};

export const LETTERS = "ABCDEFGHIJKLMNOPQ";

/* ---------- Stadium ---------- */

const SIDES: { k: StadiumSide; name: string; zoneId: string; pcts: number[]; facing: string; away?: boolean }[] = [
  { k: "N", name: "North curve", zoneId: "cat3", pcts: [60, 99, 88, 40], facing: "▼ PITCH IS THIS WAY ▼" },
  { k: "W", name: "West stand", zoneId: "cat1", pcts: [30, 55, 72, 20], facing: "▶ PITCH IS THIS WAY ▶" },
  { k: "E", name: "East stand", zoneId: "cat2", pcts: [15, 35, 50, 10], facing: "◀ PITCH IS THIS WAY ◀" },
  { k: "S", name: "South curve", zoneId: "away", pcts: [50, 50, 50, 50], facing: "▲ PITCH IS THIS WAY ▲", away: true },
];
const STADIUM_ROWS = 12;
const STADIUM_COLS = 20;

export function stadiumZones(event: EventDetail): Zone[] {
  const p = stadiumPrices(event.priceFrom);
  const away = event.awayTeam?.name ?? "Away";
  return [
    {
      id: "vip",
      name: "VIP lounge",
      short: "VIP",
      side: "W",
      where: "West upper tier",
      gates: "5–8",
      note: "Padded seats, lounge access, food included.",
      price: p.vip,
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
      note: "Covered, best view of the pitch.",
      price: p.cat1,
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
      note: "Side view, open-air.",
      price: p.cat2,
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
      note: "Home supporters end. High demand.",
      price: p.cat3,
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
      note: `${away} supporters, separate entrance road.`,
      price: p.cat3,
      availability: "restricted",
      availabilityLabel: `${away} Fan IDs only`,
      restricted: true,
      restrictedLabel: `${away} Fan IDs only`,
    },
  ];
}

export function stadiumMap(event: EventDetail, sold: ReadonlySet<string>): StadiumSeatMap {
  const zones = stadiumZones(event);
  const blocks: StadiumBlock[] = [];
  SIDES.forEach((side, si) => {
    for (let i = 0; i < 4; i += 1) {
      const id = `${side.k}${i + 1}`;
      const zone = zones.find((z) => z.id === side.zoneId)!;
      const rows = Array.from({ length: STADIUM_ROWS }, (_, r) => {
        let seats = "";
        for (let c = 0; c < STADIUM_COLS; c += 1) {
          const wheel = (side.k === "W" || side.k === "E") && r === STADIUM_ROWS - 1 && (c === 0 || c === STADIUM_COLS - 1);
          const taken =
            sold.has(`${id}-${LETTERS[r]}-${c + 1}`) || (!wheel && rnd(si * 4 + i + 1, r + 1, c + 1) * 100 < (side.pcts[i] ?? 50));
          seats += taken ? "x" : wheel ? "w" : "a";
        }
        return { label: LETTERS[r]!, seats };
      });
      blocks.push({
        id,
        side: side.k,
        sideName: side.name,
        zoneId: zone.id,
        category: zone.name === "Away fans" ? "Away fans" : zone.name,
        price: zone.price,
        away: !!side.away,
        facing: side.facing,
        rows,
      });
    }
  });
  return { layout: "stadium", zones, blocks };
}

/* ---------- Arena ---------- */

export function arenaMap(event: EventDetail): ArenaSeatMap {
  const p = arenaPrices(event.priceFrom);
  return {
    layout: "arena",
    note: "Seated tickets get the best available seats together; you can change seats on the next step. Accessible platform at Entrance C.",
    ticketTypes: [
      {
        id: "gc",
        name: "Golden Circle",
        description: "Standing, closest to the stage",
        mapLabel: "Golden Circle · standing",
        price: p.gc,
        swatch: "#3B1F6B",
        remaining: 40,
        tag: "Few left",
      },
      {
        id: "ga",
        name: "General admission",
        description: "Standing, main floor",
        mapLabel: "General admission · standing",
        price: p.ga,
        swatch: "#6B4FA0",
        remaining: 1200,
      },
      {
        id: "sa",
        name: "Seated A",
        description: "Side tiers, numbered seats",
        mapLabel: "Seated A · side tiers",
        price: p.sa,
        swatch: "#B9A7DA",
        remaining: 300,
      },
      {
        id: "sb",
        name: "Seated B",
        description: "Rear tier, numbered seats",
        mapLabel: "Seated B · rear tier",
        price: p.sb,
        swatch: "#DCD2EE",
        remaining: 500,
      },
      {
        id: "vip",
        name: "VIP package",
        description: "Box seat, lounge, fast-track, merch",
        mapLabel: "VIP boxes & lounge",
        price: p.vip,
        swatch: "#121512",
        remaining: 6,
        tag: "6 left",
      },
    ],
  };
}

/* ---------- Concert hall ---------- */

export function hallMap(event: EventDetail, sold: ReadonlySet<string>): HallSeatMap {
  const p = hallPrices(event.priceFrom);
  const tiers = [
    { id: "A", name: "Category A", where: "Stalls rows A–D", price: p.A, swatch: "#5A3A8C", edge: "#3B1F6B", onSwatch: "#FFFFFF" },
    { id: "B", name: "Category B", where: "Stalls rows E–H", price: p.B, swatch: "#8A70BD", edge: "#5A3A8C", onSwatch: "#121512" },
    { id: "C", name: "Category C", where: "Stalls rows I–L", price: p.C, swatch: "#B9A7DA", edge: "#6B4FA0", onSwatch: "#121512" },
    { id: "D", name: "Balcony", where: "Rows M–Q", price: p.D, swatch: "#E4DCF2", edge: "#8A70BD", onSwatch: "#121512" },
  ];
  const rows = Array.from({ length: 17 }, (_, r) => {
    const balcony = r >= 12;
    const n = balcony ? 24 : 14 + r;
    const tierId = balcony ? "D" : r < 4 ? "A" : r < 8 ? "B" : "C";
    const pct = balcony ? 25 : r < 4 ? 70 : 45;
    let seats = "";
    for (let c = 0; c < n; c += 1) {
      const wheel = r === 11 && (c === 0 || c === n - 1);
      const taken = sold.has(`${LETTERS[r]}-${c + 1}`) || (!wheel && rnd(r + 1, c + 1) * 100 < pct);
      seats += taken ? "x" : wheel ? "w" : "a";
    }
    return { label: LETTERS[r]!, tierId, seats, aisles: balcony ? [12] : [4, n - 4], balcony };
  });
  return {
    layout: "hall",
    tiers,
    sections: [
      { id: "stalls", title: "STALLS", rows: rows.filter((r) => !r.balcony).map(({ balcony: _b, ...row }) => row) },
      { id: "balcony", title: "BALCONY", rows: rows.filter((r) => r.balcony).map(({ balcony: _b, ...row }) => row) },
    ],
  };
}

/* ---------- Cinema ---------- */

const SLOTS = [
  { time: "13:30", format: "2D" as const, base: 15 },
  { time: "16:15", format: "2D" as const, base: 30 },
  { time: "19:00", format: "IMAX" as const, base: 70 },
  { time: "21:45", format: "2D" as const, base: 50 },
];

const pct = (day: number, slot: number) => Math.min(97, (SLOTS[slot]?.base ?? 0) + (day === 2 || day === 3 ? 22 : 0));

export function showtimeId(day: number, slot: number) {
  return `st_${day}_${slot}`;
}

export function parseShowtimeId(id: string) {
  const match = /^st_(\d)_(\d)$/.exec(id);
  if (!match) return null;
  const day = Number(match[1]);
  const slot = Number(match[2]);
  return day < 5 && slot < SLOTS.length ? { day, slot } : null;
}

export function cinemaPrices(format: "2D" | "IMAX") {
  return format === "IMAX" ? { standard: 220, vip: 380 } : { standard: 150, vip: 300 };
}

export function cinemaMap(now: Date): CinemaSeatMap {
  const showtimes: Showtime[] = [];
  for (let day = 0; day < 5; day += 1) {
    const iso = cairoDateTime(day, "12:00", now);
    const date = cairoDate(iso);
    const dow = weekdayShort(iso);
    SLOTS.forEach((slot, s) => {
      const p = pct(day, s);
      showtimes.push({
        id: showtimeId(day, s),
        date,
        dayLabel: day === 0 ? "Today" : dow,
        dayNumber: String(Number(date.slice(8, 10))),
        time: slot.time,
        format: slot.format,
        availability: p >= 90 ? "almost_full" : p >= 60 ? "filling" : "good",
        availabilityLabel: p >= 90 ? "Almost full" : p >= 60 ? "Filling up" : "Good availability",
        prices: cinemaPrices(slot.format),
      });
    });
  }
  return { layout: "cinema", screen: "Screen 4", showtimes };
}

export function cinemaSeats(id: string, sold: ReadonlySet<string>): CinemaSeats | null {
  const parsed = parseShowtimeId(id);
  if (!parsed) return null;
  const p = pct(parsed.day, parsed.slot);
  const seed = parsed.day * 10 + parsed.slot + 1;
  const rows = Array.from({ length: 10 }, (_, r) => {
    const vip = r === 9;
    const n = vip ? 8 : 16;
    let seats = "";
    for (let c = 0; c < n; c += 1) {
      const wheel = r === 0 && (c === 0 || c === n - 1);
      const centre = vip ? 0 : Math.abs(c - 7.5) < 4 && r > 3 && r < 8 ? 12 : 0;
      const taken = sold.has(`${LETTERS[r]}-${c + 1}`) || (!wheel && rnd(seed, r + 1, c + 1) * 100 < p + centre);
      seats += taken ? "x" : wheel ? "w" : "a";
    }
    return { label: LETTERS[r]!, vip, seats, aisles: vip ? [4] : [4, 12] };
  });
  return { showtimeId: id, rows };
}

export function seatMapFor(event: EventDetail, sold: ReadonlySet<string>, now: Date): SeatMap {
  switch (event.layout) {
    case "stadium":
      return stadiumMap(event, sold);
    case "arena":
      return arenaMap(event);
    case "hall":
      return hallMap(event, sold);
    case "cinema":
      return cinemaMap(now);
  }
}
