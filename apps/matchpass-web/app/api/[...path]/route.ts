import type { NextRequest } from "next/server";

/**
 * Backend-for-frontend proxy: the browser only talks to this origin (`/api/*`), and the
 * Next.js server forwards to `API_ORIGIN` (the mock API locally, the real API in production).
 * The target is read at request time, so one build works in every environment.
 */
const FORWARDED_REQUEST_HEADERS = ["authorization", "content-type", "accept", "accept-language"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "etag"];

function apiOrigin() {
  return (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/$/, "");
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${apiOrigin()}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "The Matchpass service is unavailable. Please try again shortly." } },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
