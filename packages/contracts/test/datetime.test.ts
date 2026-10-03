import { describe, expect, it } from "vitest";
import {
  addHours,
  cairoDate,
  cairoDateTime,
  dateTimeLabel,
  dayLabel,
  dayOfMonth,
  hoursUntil,
  icsTimestamp,
  longDayLabel,
  monthShort,
  numericDateLabel,
  secondsUntil,
  shortDateLabel,
  stubDateLabel,
  timeLabel,
  weekdayShort,
  yearMonthCode,
} from "../src";

// 18 Oct 2026, 17:00 UTC = 20:00 in Cairo (UTC+3, summer time).
const KICK_OFF = "2026-10-18T17:00:00.000Z";

describe("Cairo date labels (dayjs)", () => {
  it("formats every label in Cairo time", () => {
    expect(dayLabel(KICK_OFF)).toBe("Sun 18 Oct");
    expect(longDayLabel(KICK_OFF)).toBe("Sunday 18 October");
    expect(timeLabel(KICK_OFF)).toBe("20:00");
    expect(dateTimeLabel(KICK_OFF)).toBe("Sun 18 Oct · 20:00");
    expect(shortDateLabel(KICK_OFF)).toBe("18 Oct");
    expect(numericDateLabel(KICK_OFF)).toBe("18.10.26");
    expect(stubDateLabel(KICK_OFF)).toBe("18 OCT, 2026");
    expect(dayOfMonth(KICK_OFF)).toBe("18");
    expect(monthShort(KICK_OFF)).toBe("OCT");
    expect(weekdayShort(KICK_OFF)).toBe("Sun");
    expect(yearMonthCode(KICK_OFF)).toBe("2610");
  });

  it("rolls over to the Cairo calendar day, not the UTC one", () => {
    const lateUtc = "2026-10-18T22:30:00.000Z"; // 01:30 on the 19th in Cairo
    expect(cairoDate(lateUtc)).toBe("2026-10-19");
    expect(timeLabel(lateUtc)).toBe("01:30");
  });

  it("builds Cairo wall-clock timestamps with the right offset", () => {
    const iso = cairoDateTime(2, "21:00", KICK_OFF);
    expect(iso).toBe("2026-10-20T21:00:00+03:00");
    expect(timeLabel(iso)).toBe("21:00");
    // Winter time: Egypt is UTC+2 in January.
    expect(cairoDateTime(0, "09:30", "2027-01-10T12:00:00Z")).toBe("2027-01-10T09:30:00+02:00");
  });

  it("does arithmetic and ICS timestamps in UTC", () => {
    expect(addHours(KICK_OFF, -24).toISOString()).toBe("2026-10-17T17:00:00.000Z");
    expect(hoursUntil(KICK_OFF, "2026-10-18T14:00:00Z")).toBe(3);
    expect(secondsUntil(KICK_OFF, "2026-10-18T16:59:58.500Z")).toBe(2);
    expect(secondsUntil("2026-01-01T00:00:00Z", KICK_OFF)).toBe(0);
    expect(icsTimestamp(KICK_OFF)).toBe("20261018T170000Z");
  });
});
