import { intlLocaleOf, type Locale } from "./locale";

/**
 * Message catalogs are keyed by the English source text (gettext style), so components read naturally
 * (`t("Log in")`) and English never needs a catalog. A missing translation falls back to English.
 *
 * Messages support:
 * - placeholders: `"Ticket {index} of {count}"`
 * - plurals (ICU subset): `"{count, plural, one {# ticket} other {# tickets}}"` — `#` is the number.
 *   Arabic translations may use every CLDR category: zero, one, two, few, many, other.
 */
export type Catalog = Readonly<Record<string, string>>;
export type MessageValues = Readonly<Record<string, string | number>>;
export type Translate = (message: string, values?: MessageValues) => string;

const pluralRulesCache = new Map<Locale, Intl.PluralRules>();
const pluralRules = (locale: Locale) => {
  let rules = pluralRulesCache.get(locale);
  if (!rules) pluralRulesCache.set(locale, (rules = new Intl.PluralRules(intlLocaleOf(locale))));
  return rules;
};

/** Finds the matching closing brace for the `{` at `start`. */
function closingBrace(text: string, start: number) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function formatPlural(body: string, count: number, locale: Locale, values: MessageValues): string {
  const options = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    const open = body.indexOf("{", i);
    if (open === -1) break;
    const selector = body.slice(i, open).trim();
    const close = closingBrace(body, open);
    if (close === -1) break;
    options.set(selector, body.slice(open + 1, close));
    i = close + 1;
  }
  const exact = options.get(`=${count}`);
  const category = pluralRules(locale).select(count);
  const chosen = exact ?? options.get(category) ?? options.get("other") ?? "";
  return interpolate(chosen.replace(/#/g, String(count)), locale, values);
}

function interpolate(message: string, locale: Locale, values: MessageValues): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    const open = message.indexOf("{", i);
    if (open === -1) {
      out += message.slice(i);
      break;
    }
    out += message.slice(i, open);
    const close = closingBrace(message, open);
    if (close === -1) {
      out += message.slice(open);
      break;
    }
    const inner = message.slice(open + 1, close);
    const plural = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(inner);
    if (plural) {
      const count = Number(values[plural[1]!]);
      out += Number.isFinite(count) ? formatPlural(plural[2]!, count, locale, values) : message.slice(open, close + 1);
    } else {
      const name = inner.trim();
      out += name in values ? String(values[name]) : `{${inner}}`;
    }
    i = close + 1;
  }
  return out;
}

/** Formats one message (already translated or English source) with values. */
export function formatMessage(message: string, locale: Locale, values: MessageValues = {}) {
  return message.includes("{") ? interpolate(message, locale, values) : message;
}

/** A translator for one locale. Several catalogs can be layered; earlier ones win. */
export function createTranslator(locale: Locale, ...catalogs: Catalog[]): Translate {
  return (message, values) => {
    if (locale !== "en") {
      for (const catalog of catalogs) {
        const translated = catalog[message];
        if (translated !== undefined) return formatMessage(translated, locale, values);
      }
    }
    return formatMessage(message, locale, values);
  };
}

/**
 * Marks a string for translation without translating it yet — for labels defined at module level
 * (e.g. step names) that are passed through `t()` when rendered. Lets the catalog checker find them.
 */
export const msg = <T extends string>(message: T): T => message;
