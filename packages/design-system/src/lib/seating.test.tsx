import { describe, expect, it } from "vitest";
import { cinemaMap, cinemaSeats, hallMap, stadiumMap } from "../../test/fixtures";
import {
  bestTogether,
  cinemaPicked,
  cinemaSeatGroups,
  hallPicked,
  hallSeatGroups,
  stadiumPicked,
  stadiumSeatGroups,
  toggleSeat,
} from "./seating";

const block = stadiumMap.blocks.find((b) => b.id === "W2")!;

describe("toggleSeat", () => {
  it("adds, removes and enforces the maximum", () => {
    expect(toggleSeat([], "A-1", 2, "max")).toEqual({ selected: ["A-1"] });
    expect(toggleSeat(["A-1"], "A-1", 2, "max")).toEqual({ selected: [] });
    expect(toggleSeat(["A-1", "A-2"], "A-3", 2, "Up to 2")).toEqual({ selected: ["A-1", "A-2"], message: "Up to 2" });
  });
});

describe("stadium helpers", () => {
  it("builds seat cells split at the aisle with accessible labels", () => {
    const [group] = stadiumSeatGroups(block, ["W2-A-1"]);
    const rowA = group!.rows[0]!;
    expect(rowA.segments.map((s) => s.length)).toEqual([2, 3]);
    expect(rowA.segments[0]![0]).toMatchObject({ id: "W2-A-1", state: "selected", label: "Row A seat 1, selected" });
    expect(rowA.segments[1]![0]).toMatchObject({ state: "taken", label: "Row A seat 3, taken" });
    expect(rowA.segments[1]![2]).toMatchObject({ state: "wheelchair" });
    expect(rowA.segments[0]![1]!.label).toBe("Row A seat 2, available, 250 EGP");
  });

  it("finds the best adjacent seats without crossing the aisle", () => {
    const result = bestTogether(block, [], 2, 4);
    expect(result.message).toBeUndefined();
    expect(result.selected).toHaveLength(2);
    const [a, b] = result.selected.map((id) => Number(id.split("-")[2]));
    expect(b! - a!).toBe(1);
  });

  it("reports when no adjacent seats are left or the limit is hit", () => {
    const soldOut = { ...block, rows: [{ label: "A", seats: "axaxa" }] };
    expect(bestTogether(soldOut, [], 2, 4).message).toMatch(/No 2 seats together/);
    expect(bestTogether(block, ["a", "b", "c"], 2, 4).message).toMatch(/Remove a seat first/);
  });

  it("describes picked seats", () => {
    expect(stadiumPicked(stadiumMap.blocks, ["W2-B-3"])).toEqual([
      { id: "W2-B-3", label: "Block W2 · Row B · Seat 3", detail: "Category 1 · 250 EGP", price: 250 },
    ]);
  });
});

describe("hall helpers", () => {
  it("colours seats by tier and dims other tiers when filtered", () => {
    const groups = hallSeatGroups(hallMap, [], "D");
    expect(groups.map((g) => g.title)).toEqual(["STALLS", "BALCONY"]);
    const stallsSeat = groups[0]!.rows[0]!.segments[0]![0]!;
    expect(stallsSeat).toMatchObject({ fill: "#5A3A8C", dimmed: true, label: "Row A seat 1, Category A, 600 EGP" });
    expect(groups[1]!.rows[0]!.segments[0]![0]!.dimmed).toBe(false);
    expect(hallPicked(hallMap, ["M-1"])[0]).toMatchObject({ label: "Balcony · Row M · Seat 1", price: 150 });
  });
});

describe("cinema helpers", () => {
  it("prices VIP recliners and marks them wide", () => {
    const showtime = cinemaMap.showtimes[1]!;
    const groups = cinemaSeatGroups(cinemaSeats, showtime, []);
    const vipRow = groups[0]!.rows[1]!;
    expect(vipRow.spaced).toBe(true);
    expect(vipRow.segments[0]![0]).toMatchObject({ wide: true, label: "Row J seat 1, VIP recliner, 380 EGP" });
    expect(cinemaPicked(cinemaSeats, showtime, ["J-1", "A-2"]).map((p) => p.price)).toEqual([380, 220]);
  });
});
