import dayjs, { type ConfigType, type Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Matchpass sells events in Egypt; all wall-clock labels are shown in Cairo time. */
export const MATCHPASS_TIME_ZONE = "Africa/Cairo";

export { dayjs };
export type { Dayjs };

/** The instant in Cairo time. */
export const cairo = (value?: ConfigType) => dayjs(value).tz(MATCHPASS_TIME_ZONE);

/** `YYYY-MM-DD` for the given instant in Cairo. */
export const cairoDate = (value: ConfigType) => cairo(value).format("YYYY-MM-DD");

/** ISO timestamp (with Cairo offset) for `HH:mm` Cairo time, `dayOffset` days after `now`'s Cairo date. */
export function cairoDateTime(dayOffset: number, hhmm: string, now: ConfigType) {
  const day = cairo(now).add(dayOffset, "day").format("YYYY-MM-DD");
  return dayjs.tz(`${day} ${hhmm}`, MATCHPASS_TIME_ZONE).format();
}

/** `18` */
export const dayOfMonth = (iso: ConfigType) => cairo(iso).format("DD");
/** `OCT` */
export const monthShort = (iso: ConfigType) => cairo(iso).format("MMM").toUpperCase();
/** `Sat` */
export const weekdayShort = (iso: ConfigType) => cairo(iso).format("ddd");
/** `Sat 18 Oct` */
export const dayLabel = (iso: ConfigType) => cairo(iso).format("ddd D MMM");
/** `Saturday 18 October` */
export const longDayLabel = (iso: ConfigType) => cairo(iso).format("dddd D MMMM");
/** `20:00` */
export const timeLabel = (iso: ConfigType) => cairo(iso).format("HH:mm");
/** `Sat 18 Oct · 20:00` */
export const dateTimeLabel = (iso: ConfigType) => `${dayLabel(iso)} · ${timeLabel(iso)}`;
/** `18 Oct` */
export const shortDateLabel = (iso: ConfigType) => cairo(iso).format("D MMM");
/** `18.10.26` */
export const numericDateLabel = (iso: ConfigType) => cairo(iso).format("DD.MM.YY");
/** `18 OCT, 2026` */
export const stubDateLabel = (iso: ConfigType) => cairo(iso).format("D MMM, YYYY").toUpperCase();
/** `2610` — two-digit year and month, used in order and refund references. */
export const yearMonthCode = (iso: ConfigType) => cairo(iso).format("YYMM");
/** RFC 5545 UTC timestamp: `20261018T170000Z`. */
export const icsTimestamp = (iso: ConfigType) => dayjs(iso).utc().format("YYYYMMDD[T]HHmmss[Z]");

export const addSeconds = (date: ConfigType, seconds: number) => dayjs(date).add(seconds, "second").toDate();
export const addMinutes = (date: ConfigType, minutes: number) => dayjs(date).add(minutes, "minute").toDate();
export const addHours = (date: ConfigType, hours: number) => dayjs(date).add(hours, "hour").toDate();
export const addDays = (date: ConfigType, days: number) => dayjs(date).add(days, "day").toDate();
/** Whole seconds from `now` until `target`, never negative. */
export const secondsUntil = (target: ConfigType, now: ConfigType) =>
  Math.max(0, Math.ceil(dayjs(target).diff(dayjs(now), "millisecond") / 1000));
/** Fractional hours from `now` until `target` (negative when in the past). */
export const hoursUntil = (target: ConfigType, now: ConfigType) => dayjs(target).diff(dayjs(now), "hour", true);
export const isPast = (target: ConfigType, now: ConfigType) => dayjs(target).isBefore(dayjs(now));
