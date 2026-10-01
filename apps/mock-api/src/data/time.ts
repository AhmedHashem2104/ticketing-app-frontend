export const TIME_ZONE = "Africa/Cairo";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function offsetFor(date: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-]\d{2}:\d{2})/);
  return match?.[1] ?? "+00:00";
}

/** `YYYY-MM-DD` for the given instant in Cairo. */
export function cairoDate(date: Date) {
  return partsFormatter.format(date);
}

/** ISO timestamp for `HH:MM` Cairo time, `dayOffset` days from `now`'s Cairo date. */
export function cairoDateTime(dayOffset: number, hhmm: string, now: Date) {
  const [y, m, d] = cairoDate(now).split("-").map(Number);
  const noon = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + dayOffset, 12));
  const ymd = noon.toISOString().slice(0, 10);
  return `${ymd}T${hhmm}:00${offsetFor(noon)}`;
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, ...options });
const dayFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
const longFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const shortFmt = fmt({ day: "numeric", month: "short" });
const numericFmt = fmt({ day: "2-digit", month: "2-digit", year: "2-digit" });
const stubFmt = fmt({ day: "numeric", month: "short", year: "numeric" });

/** `Sat 18 Oct` */
export const dayLabel = (iso: string) => dayFmt.format(new Date(iso)).replace(",", "");
/** `Saturday 18 October` */
export const longDayLabel = (iso: string) => longFmt.format(new Date(iso)).replace(",", "");
/** `20:00` */
export const timeLabel = (iso: string) => timeFmt.format(new Date(iso));
/** `18 Oct` */
export const shortDateLabel = (iso: string) => shortFmt.format(new Date(iso));
/** `18.10.26` */
export const numericDateLabel = (iso: string) => numericFmt.format(new Date(iso)).replace(/\//g, ".");
/** `18 OCT, 2026` */
export const stubDateLabel = (iso: string) =>
  stubFmt
    .format(new Date(iso))
    .toUpperCase()
    .replace(/ (\d{4})$/, ", $1");

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
export const addHours = (date: Date, hours: number) => addMinutes(date, hours * 60);
