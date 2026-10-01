import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName } from "../lib/props";

/* ---------- Avatar ---------- */

export const avatarPropsSchema = z.object({
  initials: z.string().trim().min(1).max(3),
  size: z.enum(["sm", "md", "lg"]).optional(),
  label: z.string().min(1).optional(),
  className: zClassName,
});

export type AvatarProps = z.input<typeof avatarPropsSchema>;

const avatarSizes = { sm: "size-9 text-[13px]", md: "size-11 text-base", lg: "size-12 text-base" } as const;

/** Atom · Avatar — initials disc. Decorative unless a `label` is given. */
export function Avatar(props: AvatarProps) {
  validateProps("Avatar", avatarPropsSchema, props);
  const { initials, size = "sm", label, className } = props;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-pitch",
        avatarSizes[size],
        className,
      )}
    >
      {initials.toUpperCase()}
    </span>
  );
}

/* ---------- Logo ---------- */

export const logoPropsSchema = z.object({
  tone: z.enum(["default", "inverse", "gold"]).optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  wordmark: z.enum(["display", "ticket", "none"]).optional(),
  className: zClassName,
});

export type LogoProps = z.input<typeof logoPropsSchema>;

const logoSizes = {
  sm: { mark: 22, text: "text-[15px]" },
  md: { mark: 28, text: "text-2xl" },
  lg: { mark: 30, text: "text-[26px]" },
} as const;

/** Atom · Logo — ticket mark + MATCHPASS wordmark. */
export function Logo(props: LogoProps) {
  validateProps("Logo", logoPropsSchema, props);
  const { tone = "default", size = "md", wordmark = "display", className } = props;
  const stroke = tone === "default" ? "var(--color-pitch)" : tone === "gold" ? "var(--color-gold)" : "currentColor";
  const { mark, text } = logoSizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", tone === "default" ? "text-ink" : "text-white", className)}>
      <svg width={mark} height={mark} viewBox="0 0 36 36" fill="none" stroke={stroke} strokeWidth="2.5" aria-hidden="true">
        <path d="M4 10h28v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z" />
        <path d="M14 10v16" strokeDasharray="3 3" />
      </svg>
      {wordmark === "none" ? (
        <span className="sr-only">Matchpass</span>
      ) : wordmark === "ticket" ? (
        <span className={cn("font-ticket font-extrabold tracking-[0.02em]", text)}>Matchpass</span>
      ) : (
        <span className={cn("font-display font-extrabold tracking-[0.08em]", text)}>MATCHPASS</span>
      )}
    </span>
  );
}

/* ---------- TeamCrest ---------- */

export const teamCrestPropsSchema = z.object({
  short: z.string().trim().min(2).max(4),
  variant: z.enum(["light", "dark"]).optional(),
  size: z.enum(["sm", "lg"]).optional(),
  className: zClassName,
});

export type TeamCrestProps = z.input<typeof teamCrestPropsSchema>;

/** Atom · TeamCrest — circular club badge placeholder (decorative; the team name is always shown alongside). */
export function TeamCrest(props: TeamCrestProps) {
  validateProps("TeamCrest", teamCrestPropsSchema, props);
  const { short, variant = "light", size = "sm", className } = props;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold",
        size === "lg" ? "size-[88px] text-[32px]" : "size-14 text-[22px]",
        variant === "light" ? "bg-white text-pitch" : "border-2 border-white bg-ink text-white",
        className,
      )}
    >
      {short}
    </span>
  );
}
