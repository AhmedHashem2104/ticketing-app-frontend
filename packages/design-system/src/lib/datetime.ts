/** Matchpass sells events in Egypt; all wall-clock labels are shown in Cairo time. */
export const MATCHPASS_TIME_ZONE = "Africa/Cairo";

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: MATCHPASS_TIME_ZONE, ...options });
    cache.set(key, f);
  }
  return f;
}

const at = (iso: string) => new Date(iso);

/** `18` */
export const dayOfMonth = (iso: string) => formatter({ day: "2-digit" }).format(at(iso));
/** `OCT` */
export const monthShort = (iso: string) => formatter({ month: "short" }).format(at(iso)).toUpperCase();
/** `Sat 18 Oct` */
export const dayLabel = (iso: string) => formatter({ weekday: "short", day: "numeric", month: "short" }).format(at(iso)).replace(",", "");
/** `Saturday 18 October` */
export const longDayLabel = (iso: string) => formatter({ weekday: "long", day: "numeric", month: "long" }).format(at(iso)).replace(",", "");
/** `20:00` */
export const timeLabel = (iso: string) => formatter({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at(iso));
/** `Sat 18 Oct · 20:00` */
export const dateTimeLabel = (iso: string) => `${dayLabel(iso)} · ${timeLabel(iso)}`;
