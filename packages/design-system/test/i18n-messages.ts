import { RESALE_MIN_PRICE } from "@repo/contracts";
import { extractMessages } from "@repo/i18n";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Tests run from the package directory (Turbo and `pnpm test` both do). */
const here = join(process.cwd(), "test");

function sources(dir: string, test: (file: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path, test) : test(path) ? [readFileSync(path, "utf8")] : [];
  });
}

/** Every message the design system passes to `t()` / `msg()`. */
export function designSystemMessages() {
  const files = sources(join(here, "../src"), (f) => /\.tsx?$/.test(f) && !/\.(test|stories)\.tsx?$/.test(f) && !f.endsWith("fixtures.ts"));
  return new Set(files.flatMap(extractMessages));
}

/** Validation messages from the shared zod schemas — shown in forms through `t(error)`. */
export function contractMessages() {
  const files = sources(join(here, "../../contracts/src"), (f) => f.endsWith(".ts"));
  const found = new Set<string>();
  for (const source of files) {
    for (const m of source.matchAll(/\b(?:error|message):\s*(["`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      found.add(m[2]!.replace("${RESALE_MIN_PRICE}", String(RESALE_MIN_PRICE)));
    }
  }
  // Developer-facing schema errors that never reach a visitor.
  found.delete("Use a /path or https:// image URL");
  return found;
}
