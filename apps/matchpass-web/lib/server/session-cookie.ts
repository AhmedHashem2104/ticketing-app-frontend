/**
 * The API session token lives only in an httpOnly cookie set by the BFF — page scripts never see it,
 * so an XSS bug can't steal a fan's session.
 */
export const SESSION_COOKIE = "mp_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type CookieAttributes = { secure: boolean };

export function sessionCookie(token: string, { secure }: CookieAttributes) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearedSessionCookie({ secure }: CookieAttributes) {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", ...(secure ? ["Secure"] : [])].join("; ");
}

/** Secure cookies on HTTPS (directly or behind a TLS-terminating proxy). */
export function isSecureRequest(url: URL, forwardedProto: string | null) {
  return url.protocol === "https:" || forwardedProto?.split(",")[0]?.trim() === "https";
}

/**
 * CSRF guard for state-changing requests. Browsers always label cross-site requests (Origin and
 * Sec-Fetch-Site), so anything that says it came from another site is rejected. Non-browser
 * clients send neither header — and don't carry a victim's cookies.
 */
export function isCrossSite(headers: Headers, host: string | null) {
  const site = headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return true;
  const origin = headers.get("origin");
  if (!origin || origin === "null") return origin === "null";
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
