import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/server/csp";
import { isSecureRequest } from "@/lib/server/session-cookie";

/**
 * Runs before every page request: generates a fresh CSP nonce (Next.js reads it from the request
 * header and stamps it on its scripts) and sets the policy on the response.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    secure: isSecureRequest(request.nextUrl, request.headers.get("x-forwarded-proto")),
    reportUri: "/monitoring/csp",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: the API proxy, monitoring endpoints and static assets don't need a nonce.
      source: "/((?!api|monitoring|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
