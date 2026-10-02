import { msg } from "@repo/i18n";

/**
 * Values that reach `t()` at runtime rather than as literals — event categories, city names and refund
 * reasons. Listing them here keeps them in the Arabic catalog check, so a new category can't ship
 * untranslated. (Validation messages are collected straight from `@repo/contracts` by the same check.)
 */
export const runtimeMessages = [
  // Event categories, filters and home chips
  msg("All"),
  msg("Premier League"),
  msg("Cup"),
  msg("National team"),
  msg("African club competitions"),
  msg("Women’s league"),
  msg("Concert"),
  msg("Concerts"),
  msg("Festivals"),
  msg("Comedy"),
  msg("Theatre"),
  msg("Classical"),
  msg("Family"),
  msg("Cinema"),
  // Cities (`cityLabels`)
  msg("Cairo & Giza"),
  msg("Alexandria"),
  msg("Canal cities"),
  msg("Red Sea"),
  msg("Delta"),
  // Refund reasons (`refundReasonLabels`)
  msg("I can’t attend anymore"),
  msg("I bought the wrong tickets"),
  msg("The event details changed"),
  msg("Something else"),
] as const;
