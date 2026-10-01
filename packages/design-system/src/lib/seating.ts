import { formatMoney, segmentRow, type CinemaSeats, type HallSeatMap, type Showtime, type StadiumBlock } from "@repo/contracts";
import type { SeatCell } from "../organisms/Seating";

/**
 * Pure view-model helpers that turn API seat maps + the current selection into
 * `SeatMap` groups and "Your seats" rows. Kept free of React so apps and tests can reuse them.
 */

export type SeatSelection = { selected: string[]; message?: string };

/** Adds or removes a seat, refusing to exceed `max`. */
export function toggleSeat(selected: readonly string[], seatId: string, max: number, limitMessage: string): SeatSelection {
  if (selected.includes(seatId)) return { selected: selected.filter((id) => id !== seatId) };
  if (selected.length >= max) return { selected: [...selected], message: limitMessage };
  return { selected: [...selected, seatId] };
}

/* ---------- Stadium ---------- */

export const stadiumSeatId = (blockId: string, row: string, seat: number) => `${blockId}-${row}-${seat}`;

export function stadiumSeatGroups(block: StadiumBlock, selected: readonly string[]) {
  return [
    {
      rows: block.rows.map((row) => ({
        label: row.label,
        segments: segmentRow(row.seats, [Math.floor(row.seats.length / 2)]).map((segment) =>
          segment.map(({ number, code }): SeatCell => {
            const id = stadiumSeatId(block.id, row.label, number);
            const base = `Row ${row.label} seat ${number}`;
            if (selected.includes(id)) return { id, number, state: "selected", label: `${base}, selected` };
            if (code === "x") return { id, number, state: "taken", label: `${base}, taken` };
            if (code === "w") return { id, number, state: "wheelchair", label: `${base}, wheelchair space, available` };
            return { id, number, state: "available", label: `${base}, available, ${formatMoney(block.price)}` };
          }),
        ),
      })),
    },
  ];
}

/** Finds `count` adjacent free seats near the centre of a block. */
export function bestTogether(block: StadiumBlock, selected: readonly string[], count: number, max: number): SeatSelection {
  if (selected.length + count > max) return { selected: [...selected], message: `Remove a seat first — you can have ${max} at most.` };
  const mid = Math.floor(block.rows.length / 2);
  const rowOrder = block.rows.map((_, i) => i).sort((a, b) => Math.abs(a - mid + 0.5) - Math.abs(b - mid + 0.5));
  for (const r of rowOrder) {
    const row = block.rows[r]!;
    const half = Math.floor(row.seats.length / 2);
    const starts = Array.from({ length: row.seats.length - count + 1 }, (_, i) => i)
      .filter((start) => !(start < half && start + count > half))
      .sort((a, b) => Math.abs(a + count / 2 - half) - Math.abs(b + count / 2 - half));
    for (const start of starts) {
      const ids = Array.from({ length: count }, (_, k) => stadiumSeatId(block.id, row.label, start + k + 1));
      const free = Array.from({ length: count }, (_, k) => row.seats[start + k]).every((code) => code === "a");
      if (free && ids.every((id) => !selected.includes(id))) return { selected: [...selected, ...ids] };
    }
  }
  return { selected: [...selected], message: `No ${count} seats together left in this block. Try another block.` };
}

export function stadiumPicked(blocks: readonly StadiumBlock[], selected: readonly string[]) {
  return selected.map((id) => {
    const [blockId, row, seat] = id.split("-");
    const block = blocks.find((b) => b.id === blockId);
    return {
      id,
      label: `Block ${blockId} · Row ${row} · Seat ${seat}`,
      detail: `${block?.category ?? ""} · ${formatMoney(block?.price ?? 0)}`,
      price: block?.price ?? 0,
    };
  });
}

/* ---------- Concert hall ---------- */

export const hallSeatId = (row: string, seat: number) => `${row}-${seat}`;

export function hallSeatGroups(map: HallSeatMap, selected: readonly string[], tierFilter: string) {
  return map.sections.map((section) => ({
    title: section.title,
    rows: section.rows.map((row) => {
      const tier = map.tiers.find((t) => t.id === row.tierId)!;
      return {
        label: row.label,
        segments: segmentRow(row.seats, row.aisles).map((segment) =>
          segment.map(({ number, code }): SeatCell => {
            const id = hallSeatId(row.label, number);
            const base = `Row ${row.label} seat ${number}`;
            const dimmed = tierFilter !== "all" && tierFilter !== tier.id;
            if (selected.includes(id)) return { id, number, state: "selected", label: `${base}, selected` };
            if (code === "x") return { id, number, state: "taken", label: `${base}, taken`, dimmed };
            if (code === "w")
              return { id, number, state: "wheelchair", label: `${base}, wheelchair space, ${formatMoney(tier.price)}`, dimmed };
            return {
              id,
              number,
              state: "available",
              label: `${base}, ${tier.name}, ${formatMoney(tier.price)}`,
              fill: tier.swatch,
              edge: tier.edge,
              onFill: tier.onSwatch,
              dimmed,
            };
          }),
        ),
      };
    }),
  }));
}

export function hallPicked(map: HallSeatMap, selected: readonly string[]) {
  return selected.map((id) => {
    const [rowLabel, seat] = id.split("-");
    const section = map.sections.find((s) => s.rows.some((r) => r.label === rowLabel));
    const row = section?.rows.find((r) => r.label === rowLabel);
    const tier = map.tiers.find((t) => t.id === row?.tierId);
    return {
      id,
      label: `${section?.id === "balcony" ? "Balcony" : "Stalls"} · Row ${rowLabel} · Seat ${seat}`,
      detail: `${tier?.name ?? ""} · ${formatMoney(tier?.price ?? 0)}`,
      price: tier?.price ?? 0,
    };
  });
}

/* ---------- Cinema ---------- */

export function cinemaSeatGroups(seats: CinemaSeats, showtime: Showtime, selected: readonly string[]) {
  return [
    {
      rows: seats.rows.map((row) => ({
        label: row.label,
        spaced: row.vip,
        segments: segmentRow(row.seats, row.aisles).map((segment) =>
          segment.map(({ number, code }): SeatCell => {
            const id = hallSeatId(row.label, number);
            const base = `Row ${row.label} seat ${number}`;
            if (selected.includes(id)) return { id, number, state: "selected", label: `${base}, selected`, wide: row.vip };
            if (code === "x") return { id, number, state: "taken", label: `${base}, taken`, wide: row.vip };
            if (code === "w") return { id, number, state: "wheelchair", label: `${base}, wheelchair space` };
            return row.vip
              ? {
                  id,
                  number,
                  state: "available",
                  label: `${base}, VIP recliner, ${formatMoney(showtime.prices.vip)}`,
                  fill: "#0E4D2F",
                  edge: "#0E4D2F",
                  onFill: "#FFFFFF",
                  wide: true,
                }
              : { id, number, state: "available", label: `${base}, ${formatMoney(showtime.prices.standard)}` };
          }),
        ),
      })),
    },
  ];
}

export function cinemaPicked(seats: CinemaSeats, showtime: Showtime, selected: readonly string[]) {
  return selected.map((id) => {
    const [rowLabel, seat] = id.split("-");
    const vip = seats.rows.find((r) => r.label === rowLabel)?.vip ?? false;
    const price = vip ? showtime.prices.vip : showtime.prices.standard;
    return { id, label: `Row ${rowLabel} · Seat ${seat}`, detail: `${vip ? "VIP recliner" : "Standard"} · ${formatMoney(price)}`, price };
  });
}
