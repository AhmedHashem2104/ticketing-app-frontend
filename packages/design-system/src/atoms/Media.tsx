import { themeSchema, type Theme } from "@repo/contracts";
import { useState } from "react";
import { z } from "zod";
import { validateProps, zClassName } from "../lib/props";
import { cn } from "../lib/utils";

/**
 * Tracks whether an image failed to load, so components fall back to their themed / initials look
 * instead of showing a broken image. Resets when the `src` changes.
 */
export function useImageFallback(src: string | undefined) {
  const [failed, setFailed] = useState<string | undefined>();
  return { visible: !!src && failed !== src, onError: () => setFailed(src) };
}

/** Scrims that keep white text readable over a photo, tinted with the event theme. */
const themeScrim: Record<Theme, string> = {
  pitch: "bg-gradient-to-r from-pitch via-pitch/85 to-pitch/35",
  forest: "bg-gradient-to-r from-forest via-forest/85 to-forest/35",
  plum: "bg-gradient-to-r from-plum via-plum/85 to-plum/35",
  violet: "bg-gradient-to-r from-violet via-violet/85 to-violet/35",
  ink: "bg-gradient-to-r from-ink via-ink/85 to-ink/35",
};

/* ---------- CoverImage ---------- */

export const coverImagePropsSchema = z.object({
  src: z.string().min(1).optional(),
  /** Leave empty for decorative photos (the title is always shown as text alongside). */
  alt: z.string().optional(),
  /**
   * `theme` tints the photo with the event colour (for heroes with text on top), `bottom` darkens the
   * lower half (cards with a label over the photo) and `none` shows the photo as is.
   */
  scrim: z.enum(["theme", "bottom", "none"]).optional(),
  theme: themeSchema.optional(),
  className: zClassName,
});
export type CoverImageProps = z.input<typeof coverImagePropsSchema>;

/**
 * Atom · CoverImage — event photo that fills its positioned parent (`relative isolate`), painted behind
 * the parent's content. Renders nothing without a `src` or when the image fails, so the parent's themed
 * background shows through.
 */
export function CoverImage(props: CoverImageProps) {
  validateProps("CoverImage", coverImagePropsSchema, props);
  const { src, alt = "", scrim = "theme", theme = "ink", className } = props;
  const { visible, onError } = useImageFallback(src);
  if (!visible) return null;
  return (
    <span aria-hidden={alt ? undefined : true} className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={onError} className="size-full object-cover" />
      {scrim === "theme" ? (
        <span className={cn("absolute inset-0", themeScrim[theme])} />
      ) : scrim === "bottom" ? (
        <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
      ) : null}
    </span>
  );
}

/* ---------- Thumbnail ---------- */

export const thumbnailPropsSchema = z.object({
  src: z.string().min(1).optional(),
  theme: themeSchema.optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  className: zClassName,
});
export type ThumbnailProps = z.input<typeof thumbnailPropsSchema>;

const thumbnailSizes = { sm: "size-12 rounded-lg", md: "h-14 w-20 rounded-lg", lg: "h-[72px] w-[104px] rounded-xl" } as const;

const themeTile: Record<Theme, string> = { pitch: "bg-pitch", forest: "bg-forest", plum: "bg-plum", violet: "bg-violet", ink: "bg-ink" };

/** Atom · Thumbnail — small decorative event photo for list rows; a themed tile when there's no photo. */
export function Thumbnail(props: ThumbnailProps) {
  validateProps("Thumbnail", thumbnailPropsSchema, props);
  const { src, theme = "ink", size = "md", className } = props;
  const { visible, onError } = useImageFallback(src);
  return (
    <span aria-hidden="true" className={cn("relative block shrink-0 overflow-hidden", thumbnailSizes[size], themeTile[theme], className)}>
      {visible ? <img src={src} alt="" loading="lazy" decoding="async" onError={onError} className="size-full object-cover" /> : null}
    </span>
  );
}
