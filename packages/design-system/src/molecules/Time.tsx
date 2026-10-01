import { formatClock, splitDuration } from "@repo/contracts";
import { z } from "zod";
import { useCountdown } from "../lib/hooks";
import { validateProps, zClassName, zDateString, zFn } from "../lib/props";
import { cn } from "../lib/utils";

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
  const { expiresAt, onExpire, prefix = "Held for you", className } = props;
  const remaining = useCountdown(expiresAt, onExpire);
  const minutes = Math.ceil(remaining / 60);
  return (
    <div
      role="timer"
      aria-label={`${prefix}: ${minutes} minute${minutes === 1 ? "" : "s"} left`}
      className={cn(
        "rounded-lg px-3 py-2 font-mono text-sm whitespace-nowrap",
        remaining <= 60 ? "bg-rose-soft text-rose-ink" : "bg-amber-soft text-amber-ink",
        className,
      )}
    >
      <span aria-hidden="true">
        {prefix} {formatClock(remaining)}
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
  const { target, label = "Sale opens in", onComplete, className } = props;
  const remaining = useCountdown(target, onComplete);
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const tiles = [
    { value: days, unit: "days" },
    { value: hours, unit: "hours" },
    { value: minutes, unit: "min" },
    { value: seconds, unit: "sec" },
  ];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <span className="font-mono text-[13px] text-muted-ink uppercase">{label}</span>
      <div
        role="timer"
        aria-label={`${label} ${days} days ${hours} hours ${minutes} minutes`}
        className="grid grid-cols-4 gap-2 text-center"
      >
        {tiles.map((tile) => (
          <div key={tile.unit} aria-hidden="true" className="rounded-lg bg-paper py-2.5">
            <div className="font-display text-[36px] leading-tight font-extrabold">{String(tile.value).padStart(2, "0")}</div>
            <div className="text-xs text-muted-ink">{tile.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
