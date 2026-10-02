import { dateTimeLabel, formatMoney } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  createFormatters,
  createTranslator,
  directionOf,
  extractMessages,
  isLocalizablePath,
  localeOfPath,
  localizePath,
  missingFrom,
  negotiateLocale,
  stripLocale,
} from "../src";

describe("createTranslator", () => {
  const catalog = {
    "Log in": "تسجيل الدخول",
    "Ticket {index} of {count}": "التذكرة {index} من {count}",
    "{count, plural, one {# ticket} other {# tickets}}":
      "{count, plural, zero {لا تذاكر} one {تذكرة واحدة} two {تذكرتان} few {# تذاكر} many {# تذكرة} other {# تذكرة}}",
  };

  it("returns English source text unchanged and interpolates values", () => {
    const t = createTranslator("en", catalog);
    expect(t("Log in")).toBe("Log in");
    expect(t("Ticket {index} of {count}", { index: 1, count: 2 })).toBe("Ticket 1 of 2");
  });

  it("translates to Arabic and falls back to English for unknown messages", () => {
    const t = createTranslator("ar", catalog);
    expect(t("Log in")).toBe("تسجيل الدخول");
    expect(t("Ticket {index} of {count}", { index: 1, count: 2 })).toBe("التذكرة 1 من 2");
    expect(t("Not in the catalog")).toBe("Not in the catalog");
  });

  it("selects plural forms with the language's CLDR rules", () => {
    const key = "{count, plural, one {# ticket} other {# tickets}}";
    const en = createTranslator("en", catalog);
    expect([1, 2].map((count) => en(key, { count }))).toEqual(["1 ticket", "2 tickets"]);
    const ar = createTranslator("ar", catalog);
    expect([0, 1, 2, 3, 11, 100].map((count) => ar(key, { count }))).toEqual([
      "لا تذاكر",
      "تذكرة واحدة",
      "تذكرتان",
      "3 تذاكر",
      "11 تذكرة",
      "100 تذكرة",
    ]);
  });

  it("layers catalogs, earlier ones winning", () => {
    const t = createTranslator("ar", { A: "first" }, { A: "second", B: "only second" });
    expect([t("A"), t("B")]).toEqual(["first", "only second"]);
  });

  it("leaves unknown placeholders visible rather than dropping text", () => {
    expect(createTranslator("en")("Hello {name}")).toBe("Hello {name}");
  });
});

describe("createFormatters", () => {
  const at = "2026-10-18T20:00:00+03:00";

  it("keeps English identical to @repo/contracts", () => {
    const f = createFormatters("en");
    expect(f.money(1850)).toBe(formatMoney(1850));
    expect(f.dateTimeLabel(at)).toBe(dateTimeLabel(at));
  });

  it("formats Arabic in Cairo time with Latin digits", () => {
    const f = createFormatters("ar");
    expect(f.money(1850)).toBe("1,850 ج.م");
    expect(f.money(47.5)).toBe("47.50 ج.م");
    expect(f.timeLabel(at)).toBe("20:00");
    expect(f.dayLabel(at)).toBe("الأحد 18 أكتوبر");
    expect(f.dateTimeLabel(at)).toBe("الأحد 18 أكتوبر · 20:00");
  });
});

describe("locale helpers", () => {
  it("negotiates Accept-Language with quality values", () => {
    expect(negotiateLocale("ar-EG,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(negotiateLocale("fr-FR, en;q=0.5")).toBe("en");
    expect(negotiateLocale("en;q=0.2, ar;q=0.9")).toBe("ar");
    expect(negotiateLocale("de")).toBe("en");
    expect(negotiateLocale(undefined)).toBe("en");
  });

  it("knows Arabic is right-to-left", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });

  it("adds, swaps and strips locale prefixes", () => {
    expect(localizePath("/tickets", "ar")).toBe("/ar/tickets");
    expect(localizePath("/", "ar")).toBe("/ar");
    expect(localizePath("/?tab=cinema", "en")).toBe("/en?tab=cinema");
    expect(localizePath("/ar/events/x?y=1", "en")).toBe("/en/events/x?y=1");
    expect(localizePath("/api/payments/1", "ar")).toBe("/api/payments/1");
    expect(localizePath("https://example.com", "ar")).toBe("https://example.com");
    expect(stripLocale("/ar")).toBe("/");
    expect(stripLocale("/en/tickets")).toBe("/tickets");
    expect(stripLocale("/english")).toBe("/english");
    expect(localeOfPath("/ar/x")).toBe("ar");
    expect(isLocalizablePath("/images/a.jpg")).toBe(false);
  });
});

describe("extractMessages", () => {
  it("finds t() and msg() literals, skipping dynamic templates", () => {
    const source = `t("Log in"); t('It\\'s here', { a }); msg("Step"); t(\`Plain\`); t(\`Hi \${name}\`); format("no")`;
    expect(extractMessages(source).sort()).toEqual(["It's here", "Log in", "Plain", "Step"]);
    expect(missingFrom({ "Log in": "x" }, ["Log in", "Step"])).toEqual(["Step"]);
  });
});
