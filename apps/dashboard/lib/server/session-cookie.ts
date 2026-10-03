/**
 * The staff API token lives only in an httpOnly cookie set by the dashboard's server, so page scripts
 * never see it. It is separate from the fan site's cookie and shorter-lived: a working day.
 */
export const STAFF_COOKIE = "mp_staff";
export const STAFF_MAX_AGE_SECONDS = 12 * 60 * 60;

export type CookieAttributes = { secure: boolean };

export function staffCookie(token: string, { secure }: CookieAttributes) {
  return [
    `${STAFF_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${STAFF_MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function clearedStaffCookie({ secure }: CookieAttributes) {
  return [`${STAFF_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0", ...(secure ? ["Secure"] : [])].join("; ");
}

/** Secure cookies on HTTPS (directly or behind a TLS-terminating proxy). */
export function isSecureRequest(url: URL, forwardedProto: string | null) {
  return url.protocol === "https:" || forwardedProto?.split(",")[0]?.trim() === "https";
}

/** CSRF guard: state-changing requests that say they came from another site are refused. */
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
