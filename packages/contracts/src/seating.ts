import { z } from "zod";
import { amountSchema, idSchema } from "./common";
import { zoneAvailabilitySchema } from "./events";

/**
 * Seat rows are encoded compactly as strings, one character per seat:
 * `a` available · `x` taken · `w` wheelchair space (available).
 */
export const seatRowStringSchema = z.string().regex(/^[axw]+$/);
export type SeatCode = "a" | "x" | "w";

export const seatRowSchema = z.object({
  label: z.string().regex(/^[A-Z]$/),
  seats: seatRowStringSchema,
});
export type SeatRow = z.infer<typeof seatRowSchema>;

/* ---------- Stadium ---------- */

export const stadiumSideSchema = z.enum(["N", "W", "E", "S"]);
export type StadiumSide = z.infer<typeof stadiumSideSchema>;

export const zoneSchema = z.object({
  id: idSchema,
  name: z.string(),
  short: z.string(),
  side: stadiumSideSchema,
  where: z.string(),
  gates: z.string(),
  note: z.string(),
  price: amountSchema,
  availability: zoneAvailabilitySchema,
  availabilityLabel: z.string(),
  restricted: z.boolean(),
  restrictedLabel: z.string().optional(),
});
export type Zone = z.infer<typeof zoneSchema>;

export const stadiumBlockSchema = z.object({
  id: z.string().regex(/^[NWES][1-4]$/),
  side: stadiumSideSchema,
  sideName: z.string(),
  zoneId: idSchema,
  category: z.string(),
  price: amountSchema,
  away: z.boolean(),
  facing: z.string(),
  rows: z.array(seatRowSchema),
});
export type StadiumBlock = z.infer<typeof stadiumBlockSchema>;

export const stadiumSeatMapSchema = z.object({
  layout: z.literal("stadium"),
  zones: z.array(zoneSchema),
  blocks: z.array(stadiumBlockSchema),
});
export type StadiumSeatMap = z.infer<typeof stadiumSeatMapSchema>;

/* ---------- Arena (ticket types, general admission) ---------- */

export const ticketTypeSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string(),
  mapLabel: z.string(),
  price: amountSchema,
  swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  remaining: z.number().int().nonnegative(),
  tag: z.string().optional(),
});
export type TicketType = z.infer<typeof ticketTypeSchema>;

export const arenaSeatMapSchema = z.object({
  layout: z.literal("arena"),
  ticketTypes: z.array(ticketTypeSchema),
  note: z.string(),
});
export type ArenaSeatMap = z.infer<typeof arenaSeatMapSchema>;

/* ---------- Concert hall ---------- */

export const hallTierSchema = z.object({
  id: z.string().regex(/^[A-Z]$/),
  name: z.string(),
  where: z.string(),
  price: amountSchema,
  swatch: z.string(),
  edge: z.string(),
  onSwatch: z.string(),
});
export type HallTier = z.infer<typeof hallTierSchema>;

export const segmentedSeatRowSchema = seatRowSchema.extend({
  /** Seat indexes (0-based) where an aisle starts. */
  aisles: z.array(z.number().int().positive()),
});
export type SegmentedSeatRow = z.infer<typeof segmentedSeatRowSchema>;

export const hallSeatMapSchema = z.object({
  layout: z.literal("hall"),
  tiers: z.array(hallTierSchema),
  sections: z.array(
    z.object({
      id: z.enum(["stalls", "balcony"]),
      title: z.string(),
      rows: z.array(segmentedSeatRowSchema.extend({ tierId: z.string() })),
    }),
  ),
});
export type HallSeatMap = z.infer<typeof hallSeatMapSchema>;

/* ---------- Cinema ---------- */

export const showtimeSchema = z.object({
  id: idSchema,
  date: z.iso.date(),
  dayLabel: z.string(),
  dayNumber: z.string(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  format: z.enum(["2D", "IMAX"]),
  availability: z.enum(["good", "filling", "almost_full"]),
  availabilityLabel: z.string(),
  prices: z.object({ standard: amountSchema, vip: amountSchema }),
});
export type Showtime = z.infer<typeof showtimeSchema>;

export const cinemaSeatMapSchema = z.object({
  layout: z.literal("cinema"),
  screen: z.string(),
  showtimes: z.array(showtimeSchema),
});
export type CinemaSeatMap = z.infer<typeof cinemaSeatMapSchema>;

export const cinemaSeatsSchema = z.object({
  showtimeId: idSchema,
  rows: z.array(segmentedSeatRowSchema.extend({ vip: z.boolean() })),
});
export type CinemaSeats = z.infer<typeof cinemaSeatsSchema>;

export const seatMapSchema = z.discriminatedUnion("layout", [
  stadiumSeatMapSchema,
  arenaSeatMapSchema,
  hallSeatMapSchema,
  cinemaSeatMapSchema,
]);
export type SeatMap = z.infer<typeof seatMapSchema>;

/** Splits a row into aisle-separated segments, keeping each seat's 1-based number. */
export function segmentRow(seats: string, aisles: readonly number[]) {
  const segments: { number: number; code: SeatCode }[][] = [];
  let start = 0;
  for (const end of [...aisles, seats.length]) {
    segments.push(
      Array.from(seats.slice(start, end), (code, offset) => ({
        number: start + offset + 1,
        code: code as SeatCode,
      })),
    );
    start = end;
  }
  return segments;
}

export function countAvailable(rows: readonly { seats: string }[]) {
  return rows.reduce((total, row) => total + row.seats.replace(/x/g, "").length, 0);
}
