import { formatClock, splitDuration } from "@repo/contracts";
import { z } from "zod";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zDateString, zFn } from "../lib/props";
import { cn } from "../lib/utils";
import { useI18n } from "../lib/provider";

/* ---------- HoldTimer ---------- */

export const holdTimerPropsSchema = z.object({
  expiresAt: zDateString,
  onExpire: zFn<() => void>().optional(),
  prefix: z.string().min(1).optional(),
  className: zClassName,
});

export type HoldTimerProps = z.input<typeof holdTimerPropsSchema>;

/** Molecule · HoldTimer — "Held for you 09:42" countdown for reserved tickets. */
export function HoldTimer(props: HoldTimerProps) {
  validateProps("HoldTimer", holdTimerPropsSchema, props);
  const { t } = useI18n();
  const { expiresAt, onExpire, prefix = t("Held for you"), className } = props;
  const remaining = useCountdown(expiresAt, onExpire);
  const minutes = Math.ceil(remaining / 60);
  return (
    // The server and the browser read the clock a moment apart; the first tick after hydration corrects it.
    <div
      role="timer"
      suppressHydrationWarning
      aria-label={`${prefix}: ${t("{count, plural, one {# minute left} other {# minutes left}}", { count: minutes })}`}
      className={cn(
        "rounded-lg px-3 py-2 font-mono text-sm whitespace-nowrap",
        remaining <= 60 ? "bg-rose-soft text-rose-ink" : "bg-amber-soft text-amber-ink",
        className,
      )}
    >
      <span aria-hidden="true">
        {prefix}{" "}
        <span dir="ltr" suppressHydrationWarning>
          {formatClock(remaining)}
        </span>
      </span>
    </div>
  );
}

/* ---------- CountdownTiles ---------- */

export const countdownTilesPropsSchema = z.object({
  target: zDateString,
  label: z.string().min(1).optional(),
  onComplete: zFn<() => void>().optional(),
  className: zClassName,
});

export type CountdownTilesProps = z.input<typeof countdownTilesPropsSchema>;

/** Molecule · CountdownTiles — days / hours / min / sec until a sale opens. */
export function CountdownTiles(props: CountdownTilesProps) {
  validateProps("CountdownTiles", countdownTilesPropsSchema, props);
  const { t } = useI18n();
  const { target, label = t("Sale opens in"), onComplete, className } = props;
  const remaining = useCountdown(target, onComplete);
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const tiles = [
    { value: days, unit: t("days") },
    { value: hours, unit: t("hours") },
    { value: minutes, unit: t("min") },
    { value: seconds, unit: t("sec") },
  ];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <span className="font-mono text-[13px] text-muted-ink uppercase">{label}</span>
      <div
        role="timer"
        suppressHydrationWarning
        aria-label={`${label} ${t("{days} days {hours} hours {minutes} minutes", { days, hours, minutes })}`}
        className="grid grid-cols-4 gap-2 text-center"
      >
        {tiles.map((tile) => (
          <div key={tile.unit} aria-hidden="true" className="rounded-lg bg-paper py-2.5">
            <div className="font-display text-[36px] leading-tight font-extrabold" suppressHydrationWarning>
              {String(tile.value).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-ink">{tile.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
