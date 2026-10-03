import { themeSchema } from "@repo/contracts";
import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zDateString } from "../lib/props";
import { themeSurface } from "../lib/theme";
import { useI18n } from "../lib/provider";

/* ---------- DateBadge ---------- */

export const dateBadgePropsSchema = z.object({
  date: zDateString,
  theme: themeSchema.optional(),
  size: z.enum(["sm", "md"]).optional(),
  variant: z.enum(["tile", "plain"]).optional(),
  className: zClassName,
});

export type DateBadgeProps = z.input<typeof dateBadgePropsSchema>;

/** Atom · DateBadge — day + month tile ("18 OCT"). */
export function DateBadge(props: DateBadgeProps) {
  validateProps("DateBadge", dateBadgePropsSchema, props);
  const { date, theme = "pitch", size = "md", variant = "tile", className } = props;
  const { f } = useI18n();
  const day = f.dayOfMonth(date);
  const month = f.monthShort(date);
  if (variant === "plain") {
    return (
      <span className={cn("flex w-14 shrink-0 flex-col items-center", className)}>
        <span className="font-display text-[28px] leading-none font-extrabold">{day}</span>
        <span className="text-xs text-muted-ink">{month}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-[10px]",
        themeSurface[theme],
        size === "md" ? "size-[68px]" : "size-[60px]",
        className,
      )}
    >
      <span className={cn("font-display leading-none font-extrabold", size === "md" ? "text-[30px]" : "text-[26px]")}>{day}</span>
      <span className="text-[11px] tracking-[0.06em] md:text-xs">{month}</span>
    </span>
  );
}

/* ---------- Money ---------- */

export const moneyPropsSchema = z.object({
  amount: z.number().finite(),
  variant: z.enum(["plain", "mono", "display", "ticket"]).optional(),
  signed: z.boolean().optional(),
  className: zClassName,
});

export type MoneyProps = z.input<typeof moneyPropsSchema>;

/** Atom · Money — formatted EGP amount. */
export function Money(props: MoneyProps) {
  validateProps("Money", moneyPropsSchema, props);
  const { amount, variant = "plain", signed, className } = props;
  const { f } = useI18n();
  const text = `${signed && amount < 0 ? "− " : ""}${f.money(Math.abs(amount))}`;
  return (
    <span
      className={cn(
        variant === "mono" && "font-mono",
        variant === "display" && "font-display font-extrabold leading-none",
        variant === "ticket" && "font-ticket font-black leading-none",
        className,
      )}
    >
      {text}
    </span>
  );
}
