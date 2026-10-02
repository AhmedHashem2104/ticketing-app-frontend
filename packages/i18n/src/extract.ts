/**
 * Finds the translatable messages in source code: string literals passed to `t(...)` or `msg(...)`.
 * Used by each package's catalog-coverage test, so a new English string without an Arabic
 * translation fails CI instead of silently showing English to Arabic readers.
 */
export function extractMessages(source: string): string[] {
  const found = new Set<string>();
  const pattern = /\b(?:t|msg)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/g;
  for (const match of source.matchAll(pattern)) {
    const quote = match[1];
    const raw = match[2] ?? "";
    // Template literals with ${...} are dynamic — they can't be catalog keys.
    if (quote === "`" && raw.includes("${")) continue;
    found.add(raw.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n"));
  }
  return [...found];
}

/** Messages from `messages` that the catalog doesn't translate. */
export const missingFrom = (catalog: Readonly<Record<string, string>>, messages: Iterable<string>) =>
  [...messages].filter((m) => catalog[m] === undefined);
