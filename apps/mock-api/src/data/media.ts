/**
 * Seed imagery. Files live in the web app's `public/images` (see its CREDITS.md) and are returned as
 * same-origin paths, so they load through the app's `img-src 'self'` CSP and work offline.
 */
export const eventImageUrl = (slug: string) => `/images/events/${slug}.jpg`;

export const teamLogoUrl = (short: string) => `/images/teams/${short.toLowerCase()}.svg`;

const AVATARS: Record<string, string> = {
  omar: "/images/avatars/omar.jpg",
  youssef: "/images/avatars/youssef.jpg",
  karim: "/images/avatars/karim.jpg",
  hassan: "/images/avatars/hassan.jpg",
  mariam: "/images/avatars/mariam.jpg",
};

/** Profile photo for a seeded person, matched by first name ("Omar K. (you)" → Omar). New sign-ups have none. */
export const avatarFor = (name: string): string | undefined => AVATARS[name.trim().split(/\s+/)[0]?.toLowerCase() ?? ""];

/** Spreads `{ avatarUrl }` only when there is one (keeps optional fields absent rather than `undefined`). */
export const withAvatar = (name: string) => {
  const avatarUrl = avatarFor(name);
  return avatarUrl ? { avatarUrl } : {};
};
