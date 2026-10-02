import { isLocalizablePath, isLocale, LOCALE_COOKIE, localeOfPath, localizePath, negotiateLocale } from "@repo/i18n";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/server/csp";
import { isSecureRequest, STAFF_COOKIE } from "@/lib/server/session-cookie";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Runs before every dashboard page.
 *
 * - Language: pages live under `/en` or `/ar`; other paths are redirected to the remembered language,
 *   else the browser's, else English.
 * - Sign-in: without a staff cookie every page except the sign-in page redirects to it (the API still
 *   checks the token and the role on every call — this only saves a round trip).
 * - Security: a per-request CSP nonce.
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

  if (pathLocale && !request.cookies.has(STAFF_COOKIE) && pathname !== `/${pathLocale}/login`) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pathLocale}/login`;
    url.search = pathname === `/${pathLocale}` ? "" : `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url, 307);
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development", secure });
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
      source: "/((?!api|_next/static|_next/image|images|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
