import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zNode } from "../lib/props";

const displaySizes = {
  xs: "text-lg",
  sm: "text-[24px]",
  md: "text-[28px]",
  lg: "text-[30px]",
  xl: "text-[36px]",
  "2xl": "text-[40px] md:text-[44px]",
  "3xl": "text-[44px] md:text-[56px]",
  "4xl": "text-[48px] md:text-[64px]",
  "5xl": "text-[52px] md:text-[80px]",
} as const;

export const headingPropsSchema = z.object({
  as: z.enum(["h1", "h2", "h3", "h4", "p", "span"]).optional(),
  size: z.enum(Object.keys(displaySizes) as [keyof typeof displaySizes, ...(keyof typeof displaySizes)[]]).optional(),
  font: z.enum(["display", "ticket", "sans"]).optional(),
  uppercase: z.boolean().optional(),
  id: z.string().optional(),
  className: zClassName,
  children: zNode,
});

export type HeadingProps = z.input<typeof headingPropsSchema>;

const fonts = {
  display: "font-display font-extrabold leading-none",
  ticket: "font-ticket font-black leading-none tracking-[-0.01em]",
  sans: "font-sans font-semibold leading-tight",
} as const;

/** Atom · Heading — condensed display type used for every Matchpass title. */
export function Heading(props: HeadingProps) {
  validateProps("Heading", headingPropsSchema, props);
  const { as: Tag = "h2", size = "xl", font = "display", uppercase = font !== "sans", className, children, id } = props;
  return (
    <Tag id={id} className={cn(fonts[font], displaySizes[size], uppercase && "uppercase", "text-balance", className)}>
      {children}
    </Tag>
  );
}

export const eyebrowPropsSchema = z.object({
  tone: z.enum(["gold", "muted", "pitch", "inverse", "lilac"]).optional(),
  size: z.enum(["sm", "md"]).optional(),
  as: z.enum(["span", "p", "div"]).optional(),
  className: zClassName,
  children: zNode,
});

export type EyebrowProps = z.input<typeof eyebrowPropsSchema>;

const eyebrowTones = {
  gold: "text-gold",
  muted: "text-muted-ink",
  pitch: "text-pitch",
  inverse: "text-white",
  lilac: "text-lilac",
} as const;

/** Atom · Eyebrow — monospace kicker above titles (e.g. "PREMIER LEAGUE · MATCHDAY 12"). */
export function Eyebrow(props: EyebrowProps) {
  validateProps("Eyebrow", eyebrowPropsSchema, props);
  const { tone = "muted", size = "md", as: Tag = "span", className, children } = props;
  return (
    <Tag className={cn("font-mono tracking-[0.06em] uppercase", size === "sm" ? "text-xs" : "text-[13px]", eyebrowTones[tone], className)}>
      {children}
    </Tag>
  );
}

export const visuallyHiddenPropsSchema = z.object({ children: zNode, as: z.enum(["span", "div", "h2", "legend"]).optional() });
export type VisuallyHiddenProps = z.input<typeof visuallyHiddenPropsSchema>;

/** Atom · VisuallyHidden — content for assistive tech only. */
export function VisuallyHidden(props: VisuallyHiddenProps) {
  validateProps("VisuallyHidden", visuallyHiddenPropsSchema, props);
  const { as: Tag = "span", children } = props;
  return <Tag className="sr-only">{children}</Tag>;
}
