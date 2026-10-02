import { arCatalog, extractMessages, missingFrom } from "@repo/i18n";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Tests run from the app directory. */
const root = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}

describe("dashboard Arabic catalog", () => {
  it("translates every message the app passes to t() / msg()", () => {
    const messages = new Set(["app", "components", "lib", "views"].flatMap((d) => sources(join(root, d))).flatMap(extractMessages));
    expect(missingFrom(arCatalog, messages)).toEqual([]);
  });
});
