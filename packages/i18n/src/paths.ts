import { isLocale, type Locale } from "./locale";

/** Paths that are never localized: the API proxy, monitoring, static files and Next internals. */
const UNLOCALIZED = /^\/(?:api|monitoring|_next|images|favicon\.ico|robots\.txt|sitemap\.xml)(?:\/|$)/;

export const isLocalizablePath = (path: string) => path.startsWith("/") && !path.startsWith("//") && !UNLOCALIZED.test(path);

/** The locale prefix of a pathname, if any: `/ar/tickets` → `ar`. */
export function localeOfPath(pathname: string): Locale | undefined {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : undefined;
}

/** Removes a leading locale segment: `/ar/tickets?x=1` → `/tickets?x=1`, `/ar` → `/`. */
export function stripLocale(path: string): string {
  const locale = localeOfPath(path);
  if (!locale) return path;
  const rest = path.slice(locale.length + 1);
  return rest === "" || rest.startsWith("?") || rest.startsWith("#") ? `/${rest}` : rest;
}

/**
 * Prefixes an app path with the locale: `/tickets` → `/ar/tickets`, `/` → `/ar`. External URLs, hash
 * links, API/static paths and already-prefixed paths are returned unchanged (re-prefixed if needed).
 */
export function localizePath(path: string, locale: Locale): string {
  if (!isLocalizablePath(path)) return path;
  const bare = stripLocale(path);
  if (bare === "/") return `/${locale}`;
  if (bare.startsWith("/?") || bare.startsWith("/#")) return `/${locale}${bare.slice(1)}`;
  return `/${locale}${bare}`;
}
