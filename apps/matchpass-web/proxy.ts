import { isLocalizablePath, isLocale, LOCALE_COOKIE, localeOfPath, localizePath, negotiateLocale } from "@repo/i18n";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/server/csp";
import { isSecureRequest } from "@/lib/server/session-cookie";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Runs before every page request.
 *
 * - Language: pages live under `/en` or `/ar`. A path without one (old links, SMS links, `/`) is
 *   redirected to the visitor's language — the one they last used (cookie), else their browser's
 *   `Accept-Language`, else English. Visiting a prefixed page remembers that language.
 * - Security: generates a fresh CSP nonce (Next.js reads it from the request header and stamps it on
 *   its scripts) and sets the policy on the response.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const secure = isSecureRequest(request.nextUrl, request.headers.get("x-forwarded-proto"));
  const pathLocale = localeOfPath(pathname);

  if (!pathLocale && isLocalizablePath(pathname)) {
    const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(remembered) ? remembered : negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, locale);
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    secure,
    reportUri: "/monitoring/csp",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (pathLocale && request.cookies.get(LOCALE_COOKIE)?.value !== pathLocale) {
    response.cookies.set(LOCALE_COOKIE, pathLocale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax", secure });
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: the API proxy, monitoring endpoints and static assets don't need a nonce.
      source: "/((?!api|monitoring|_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
