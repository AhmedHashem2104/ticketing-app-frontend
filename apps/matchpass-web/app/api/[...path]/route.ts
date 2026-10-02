import type { NextRequest } from "next/server";
import { clearedSessionCookie, isCrossSite, isSecureRequest, SESSION_COOKIE, sessionCookie } from "@/lib/server/session-cookie";

/**
 * Backend-for-frontend proxy: the browser only talks to this origin (`/api/*`), and the
 * Next.js server forwards to `API_ORIGIN` (the mock API locally, the real API in production).
 *
 * - Sessions: the API's bearer token is kept in an httpOnly cookie. Auth responses are rewritten
 *   to `{ user }`, and every forwarded request gets `Authorization` from the cookie.
 * - CSRF: state-changing requests from another site are refused.
 * - Observability: a request id is attached (or passed through) and returned to the browser.
 */
const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language", "user-agent"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "location", "retry-after", "content-disposition"];
/** Endpoints whose successful response carries a new session token. */
const SESSION_ISSUING = new Set(["auth/login", "auth/verify", "auth/password/reset"]);

function apiOrigin() {
  return (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");
}

const json = (status: number, code: string, message: string, headers?: HeadersInit) =>
  Response.json({ error: { code, message } }, { status, headers });

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const route = path.join("/");
  const method = request.method;
  const secure = isSecureRequest(request.nextUrl, request.headers.get("x-forwarded-proto"));

  if (method !== "GET" && method !== "HEAD" && isCrossSite(request.headers, request.headers.get("host"))) {
    return json(403, "FORBIDDEN", "Cross-site requests are not allowed");
  }

  const requestId = request.headers.get("x-request-id")?.match(/^[\w-]{8,64}$/)?.[0] ?? crypto.randomUUID();
  const headers = new Headers({ "x-request-id": requestId });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const target = `${apiOrigin()}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json(502, "INTERNAL_ERROR", "The Matchpass service is unavailable. Please try again shortly.", { "x-request-id": requestId });
  }

  const responseHeaders = new Headers({ "x-request-id": requestId });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  // Logging out always clears the cookie, even if the API session had already expired.
  if (route === "auth/logout") {
    responseHeaders.append("set-cookie", clearedSessionCookie({ secure }));
    return new Response(null, { status: upstream.ok || upstream.status === 401 ? 204 : upstream.status, headers: responseHeaders });
  }

  if (SESSION_ISSUING.has(route) && upstream.ok) {
    const body = (await upstream.json()) as { token?: string; user?: unknown };
    if (body.token) responseHeaders.append("set-cookie", sessionCookie(body.token, { secure }));
    responseHeaders.set("cache-control", "no-store");
    return Response.json({ user: body.user }, { status: upstream.status, headers: responseHeaders });
  }

  // The API no longer recognises the session: drop the stale cookie.
  if (upstream.status === 401 && token) responseHeaders.append("set-cookie", clearedSessionCookie({ secure }));

  const empty = upstream.status === 204 || upstream.status === 304 || method === "HEAD";
  return new Response(empty ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
