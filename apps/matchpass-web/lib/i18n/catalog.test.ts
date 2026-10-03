import { arCatalog, extractMessages, missingFrom } from "@repo/i18n";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INFO_PAGES } from "../content/info-pages";
import { INFO_PAGES_AR } from "../content/info-pages.ar";
import { appCatalog } from "./catalog";

/** Tests run from the app directory. */
const root = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}

export const appMessages = () =>
  new Set(["app", "components", "lib", "views"].flatMap((d) => sources(join(root, d))).flatMap(extractMessages));

describe("web app Arabic catalog", () => {
  it("translates every message the app passes to t() / msg()", () => {
    const catalog = { ...arCatalog, ...appCatalog };
    expect(missingFrom(catalog, appMessages())).toEqual([]);
  });

  it("keeps placeholders intact in every app translation", () => {
    const names = (text: string) =>
      [...text.matchAll(/\{(\w+)(?:,|\})/g)]
        .map((m) => m[1])
        .sort()
        .join();
    expect(Object.entries(appCatalog).filter(([en, ar]) => names(en) !== names(ar))).toEqual([]);
  });

  it("has the same help and policy pages, with the same sections, in Arabic", () => {
    expect(Object.keys(INFO_PAGES_AR).sort()).toEqual(Object.keys(INFO_PAGES).sort());
    for (const [slug, page] of Object.entries(INFO_PAGES)) {
      expect(
        INFO_PAGES_AR[slug]!.sections.map((s) => s.id),
        slug,
      ).toEqual(page.sections.map((s) => s.id));
    }
  });
});
