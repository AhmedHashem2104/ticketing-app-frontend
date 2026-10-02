import { arCatalog, negotiateLocale, type Locale } from "@repo/i18n";
import type { RequestHandler } from "express";
import { AR_CONTENT } from "./content-ar";
import { AR_PATTERNS } from "./patterns-ar";
import { AR_STAFF_CONTENT } from "./content-staff-ar";

/**
 * Arabic API content.
 *
 * The store keeps one copy of every record (event names, ticket labels, notifications…) in English, the
 * way a real system keeps canonical data. Responses are localized on the way out when the caller asks
 * for Arabic (`Accept-Language: ar`): every display string in the JSON body is translated, while ids,
 * codes, URLs, timestamps and enum values are left untouched so clients keep working in any language.
 *
 * Translation, in order: exact phrases (API content, then the shared UI catalog — it holds the form
 * validation messages), then patterns for composed strings ("Fan ID •••• 4821", dates, counts), then
 * the parts of `·`-separated labels one by one. Anything unknown is returned as is; the catalog test
 * crawls every endpoint and fails on English left in an Arabic response.
 */

/** Keys whose values are identifiers, codes, links, timestamps or enum values — never translated. */
const RAW_KEYS = new Set([
  "id",
  "slug",
  "eventSlug",
  "eventId",
  "orderId",
  "holdId",
  "ticketId",
  "listingId",
  "userId",
  "scanId",
  "verificationId",
  "showtimeId",
  "zoneId",
  "tierId",
  "fanId",
  "fanIds",
  "seatIds",
  "ticketIds",
  "code",
  "reference",
  "token",
  "href",
  "url",
  "redirectUrl",
  "backHref",
  "imageUrl",
  "logoUrl",
  "avatarUrl",
  "photoUrl",
  "email",
  "status",
  "kind",
  "layout",
  "theme",
  "variant",
  "category",
  "categories",
  "city",
  "cities",
  "phase",
  "method",
  "availability",
  "state",
  "tone",
  "noteTone",
  "direction",
  "transferMode",
  "type",
  "side",
  "swatch",
  "edge",
  "onSwatch",
  "fill",
  "format",
  "date",
  "startsAt",
  "endsAt",
  "createdAt",
  "expiresAt",
  "saleOpensAt",
  "submittedAt",
  "time",
  "number",
  "promoCode",
  "seats",
  "seatKeys",
  "role",
  "permissions",
  "eventKind",
  "path",
  "organizerId",
  "result",
  "documentType",
  "fanIdStatus",
  "ticketCode",
  "payDate",
  "at",
  "requestedAt",
]);

export type Translator = (text: string) => string;

const AR_DICTIONARY: Readonly<Record<string, string>> = { ...arCatalog, ...AR_CONTENT, ...AR_STAFF_CONTENT };
/** Upper-case labels (ticket tags such as "CONCERT · POP") match their sentence-case entries. */
const AR_DICTIONARY_CI = new Map(Object.entries(AR_DICTIONARY).map(([en, ar]) => [en.toLowerCase(), ar]));

const AR_WEEKDAYS: Record<string, string> = {
  Monday: "الاثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
  Saturday: "السبت",
  Sunday: "الأحد",
  Mon: "الاثنين",
  Tue: "الثلاثاء",
  Wed: "الأربعاء",
  Thu: "الخميس",
  Fri: "الجمعة",
  Sat: "السبت",
  Sun: "الأحد",
};

const AR_MONTHS: Record<string, string> = {
  January: "يناير",
  February: "فبراير",
  March: "مارس",
  April: "أبريل",
  May: "مايو",
  June: "يونيو",
  July: "يوليو",
  August: "أغسطس",
  September: "سبتمبر",
  October: "أكتوبر",
  November: "نوفمبر",
  December: "ديسمبر",
  Jan: "يناير",
  Feb: "فبراير",
  Mar: "مارس",
  Apr: "أبريل",
  Jun: "يونيو",
  Jul: "يوليو",
  Aug: "أغسطس",
  Sep: "سبتمبر",
  Oct: "أكتوبر",
  Nov: "نوفمبر",
  Dec: "ديسمبر",
};

const MONTH = Object.keys(AR_MONTHS).join("|");
const WEEKDAY = Object.keys(AR_WEEKDAYS).join("|");
const monthAr = (m: string) => AR_MONTHS[m] ?? AR_MONTHS[m.charAt(0) + m.slice(1).toLowerCase()] ?? m;

/** English date fragments the API composes into labels ("Sun 18 Oct", "Saturday 18 October", "18 OCT, 2026", "21 SEP"). */
const DATE_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [new RegExp(`^(${WEEKDAY}) (\\d{1,2}) (${MONTH})$`), (m) => `${AR_WEEKDAYS[m[1]!]} ${m[2]} ${monthAr(m[3]!)}`],
  [new RegExp(`^(\\d{1,2}) (${MONTH}),? (\\d{4})$`, "i"), (m) => `${m[1]} ${monthAr(m[2]!)} ${m[3]}`],
  [new RegExp(`^(\\d{1,2}) (${MONTH})$`, "i"), (m) => `${m[1]} ${monthAr(m[2]!)}`],
  [new RegExp(`^(\\d{1,2}) (${MONTH}), (\\d{2}:\\d{2})$`), (m) => `${m[1]} ${monthAr(m[2]!)}، ${m[3]}`],
  [new RegExp(`^(${WEEKDAY})$`), (m) => AR_WEEKDAYS[m[1]!]!],
];

export type Pattern = [RegExp, (m: RegExpExecArray, tr: Translator) => string];

function arabicTranslator(): Translator {
  const cache = new Map<string, string>();
  const translate: Translator = (text) => {
    const trimmed = text.trim();
    if (!trimmed || !/[A-Za-z]/.test(trimmed)) return text;
    const cached = cache.get(trimmed);
    if (cached !== undefined) return cached;
    const result = translateUncached(trimmed);
    if (cache.size < 5_000) cache.set(trimmed, result);
    return result;
  };

  const translateUncached = (text: string): string => {
    const exact = AR_DICTIONARY[text] ?? AR_DICTIONARY_CI.get(text.toLowerCase());
    if (exact !== undefined) return exact;
    for (const [pattern, build] of DATE_PATTERNS) {
      const m = pattern.exec(text);
      if (m) return build(m);
    }
    for (const [pattern, build] of AR_PATTERNS) {
      const m = pattern.exec(text);
      if (m) return build(m, translate);
    }
    if (text.includes(" · ")) return text.split(" · ").map(translate).join(" · ");
    if (text.includes(" — ")) return text.split(" — ").map(translate).join(" — ");
    if (text.includes(" – ")) return text.split(" – ").map(translate).join(" – ");
    if (text.includes(", ")) {
      const parts = text.split(", ");
      const translated = parts.map(translate);
      if (translated.some((p, i) => p !== parts[i])) return translated.join("، ");
    }
    // A trailing full stop shouldn't stop an otherwise known sentence from matching.
    if (text.endsWith(".") && AR_DICTIONARY[text.slice(0, -1)]) return `${AR_DICTIONARY[text.slice(0, -1)]}.`;
    return text;
  };

  return translate;
}

let arabic: Translator | undefined;

/** Translator for API content in a language (identity for English). */
export function contentTranslator(locale: Locale): Translator {
  if (locale === "en") return (text) => text;
  return (arabic ??= arabicTranslator());
}

/** Deep-translates the display strings of a JSON value. */
export function localizeBody(value: unknown, translate: Translator, key?: string): unknown {
  if (key && RAW_KEYS.has(key)) return value;
  if (typeof value === "string") return translate(value);
  if (Array.isArray(value)) return value.map((item) => localizeBody(item, translate, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localizeBody(v, translate, k)]));
  }
  return value;
}

/** The request's language from `Accept-Language` (or `?lang=` for pages opened directly, like the payment page). */
export const requestLocale = (acceptLanguage: string | undefined, lang?: unknown): Locale =>
  lang === "ar" || lang === "en" ? lang : negotiateLocale(acceptLanguage);

/**
 * Express middleware: records the caller's language in `res.locals.locale` and localizes every JSON
 * response — including error bodies — when it isn't English.
 */
export const localizeResponses: RequestHandler = (req, res, next) => {
  const locale = requestLocale(req.get("accept-language"), req.query.lang);
  res.locals.locale = locale;
  res.setHeader("Content-Language", locale);
  res.vary("Accept-Language");
  if (locale !== "en") {
    const translate = contentTranslator(locale);
    const json = res.json.bind(res);
    res.json = (body: unknown) => json(localizeBody(body, translate));
  }
  next();
};
