import type { Theme } from "@repo/contracts";

/** Background + on-colour classes for event themes (hero cards, banners, date tiles). */
export const themeSurface: Record<Theme, string> = {
  pitch: "bg-pitch text-white",
  forest: "bg-forest text-white",
  plum: "bg-plum text-white",
  violet: "bg-violet text-white",
  ink: "bg-ink text-white",
};

/** Muted text colour to use on top of each themed surface. */
export const themeMuted: Record<Theme, string> = {
  pitch: "text-mint",
  forest: "text-mint",
  plum: "text-lilac",
  violet: "text-lilac",
  ink: "text-ash",
};

export const themeValues = ["pitch", "forest", "plum", "violet", "ink"] as const satisfies readonly Theme[];
