import type { NextRequest } from "next/server";
import { clearedStaffCookie, isCrossSite, isSecureRequest, STAFF_COOKIE, staffCookie } from "@/lib/server/session-cookie";

/**
 * Backend-for-frontend proxy for the dashboard. The browser only talks to this origin; the server
 * forwards `/api/staff/*` to `API_ORIGIN` with the staff token from the httpOnly cookie.
 *
 * - Only staff endpoints are reachable — the dashboard can't be used to call fan endpoints.
 * - Sign-in responses are rewritten to `{ staff }`; the token goes into the cookie.
 * - Cross-site state-changing requests are refused (CSRF).
 */
const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language", "user-agent"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "retry-after", "content-disposition"];

const apiOrigin = () => (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");

const json = (status: number, code: string, message: string, headers?: HeadersInit) =>
  Response.json({ error: { code, message } }, { status, headers });

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const route = path.join("/");
  const method = request.method;
  const secure = isSecureRequest(request.nextUrl, request.headers.get("x-forwarded-proto"));

  if (path[0] !== "staff") return json(404, "NOT_FOUND", "Not found");
  if (method !== "GET" && method !== "HEAD" && isCrossSite(request.headers, request.headers.get("host"))) {
    return json(403, "FORBIDDEN", "Cross-site requests are not allowed");
  }

  const requestId = request.headers.get("x-request-id")?.match(/^[\w-]{8,64}$/)?.[0] ?? crypto.randomUUID();
  const headers = new Headers({ "x-request-id": requestId });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = request.cookies.get(STAFF_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, {
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

  const responseHeaders = new Headers({ "x-request-id": requestId, "cache-control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  if (route === "staff/auth/logout") {
    responseHeaders.append("set-cookie", clearedStaffCookie({ secure }));
    return new Response(null, { status: upstream.ok || upstream.status === 401 ? 204 : upstream.status, headers: responseHeaders });
  }

  if (route === "staff/auth/login" && upstream.ok) {
    const body = (await upstream.json()) as { token?: string; staff?: unknown };
    if (body.token) responseHeaders.append("set-cookie", staffCookie(body.token, { secure }));
    return Response.json({ staff: body.staff }, { status: upstream.status, headers: responseHeaders });
  }

  if (upstream.status === 401 && token) responseHeaders.append("set-cookie", clearedStaffCookie({ secure }));

  const empty = upstream.status === 204 || upstream.status === 304 || method === "HEAD";
  return new Response(empty ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
