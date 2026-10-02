import {
  MATCHPASS_TIME_ZONE,
  dateTimeLabel,
  dayLabel,
  dayOfMonth,
  formatAmount,
  formatMoney,
  longDayLabel,
  monthShort,
  numericDateLabel,
  shortDateLabel,
  stubDateLabel,
  timeLabel,
  weekdayShort,
} from "@repo/contracts";
import { intlLocaleOf, type Locale } from "./locale";

type DateInput = string | number | Date;

/** Locale-aware number, money and Cairo-time date formatting. English output matches `@repo/contracts` exactly. */
export type Formatters = {
  locale: Locale;
  number: (value: number) => string;
  /** `1,850 EGP` · `1,850 ج.م` */
  money: (amount: number) => string;
  /** `1,850.00` */
  amount: (amount: number) => string;
  /** Currency label on its own: `EGP` · `ج.م` */
  currency: string;
  /** `18` */
  dayOfMonth: (value: DateInput) => string;
  /** `OCT` · `أكتوبر` */
  monthShort: (value: DateInput) => string;
  /** `Sun` · `الأحد` */
  weekdayShort: (value: DateInput) => string;
  /** `Sun 18 Oct` · `الأحد 18 أكتوبر` */
  dayLabel: (value: DateInput) => string;
  /** `Sunday 18 October` · `الأحد 18 أكتوبر` */
  longDayLabel: (value: DateInput) => string;
  /** `20:00` */
  timeLabel: (value: DateInput) => string;
  /** `Sun 18 Oct · 20:00` */
  dateTimeLabel: (value: DateInput) => string;
  /** `18 Oct` · `18 أكتوبر` */
  shortDateLabel: (value: DateInput) => string;
  /** `18.10.26` */
  numericDateLabel: (value: DateInput) => string;
  /** `18 OCT, 2026` · `18 أكتوبر 2026` */
  stubDateLabel: (value: DateInput) => string;
};

const english: Formatters = {
  locale: "en",
  number: (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value),
  money: (amount) => formatMoney(amount),
  amount: formatAmount,
  currency: "EGP",
  dayOfMonth,
  monthShort,
  weekdayShort,
  dayLabel,
  longDayLabel,
  timeLabel,
  dateTimeLabel,
  shortDateLabel,
  numericDateLabel,
  stubDateLabel,
};

function arabic(): Formatters {
  const tag = intlLocaleOf("ar");
  const date = (options: Intl.DateTimeFormatOptions) => {
    const f = new Intl.DateTimeFormat(tag, { ...options, timeZone: MATCHPASS_TIME_ZONE });
    return (value: DateInput) => f.format(new Date(value));
  };
  const whole = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  const fixed = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = date({ weekday: "long", day: "numeric", month: "long" });
  const time = date({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const currency = "ج.م";
  return {
    locale: "ar",
    number: (value) => whole.format(value),
    money: (amount) => `${Number.isInteger(amount) ? whole.format(amount) : fixed.format(amount)} ${currency}`,
    amount: (amount) => fixed.format(amount),
    currency,
    dayOfMonth: date({ day: "2-digit" }),
    monthShort: date({ month: "long" }),
    weekdayShort: date({ weekday: "long" }),
    dayLabel: (value) => day(value).replace("،", ""),
    longDayLabel: (value) => day(value).replace("،", ""),
    timeLabel: time,
    dateTimeLabel: (value) => `${day(value).replace("،", "")} · ${time(value)}`,
    shortDateLabel: date({ day: "numeric", month: "long" }),
    numericDateLabel,
    stubDateLabel: date({ day: "numeric", month: "long", year: "numeric" }),
  };
}

let arabicFormatters: Formatters | undefined;

export function createFormatters(locale: Locale): Formatters {
  if (locale === "en") return english;
  return (arabicFormatters ??= arabic());
}
