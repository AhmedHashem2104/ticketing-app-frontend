const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const fixed = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `1850` → `1,850 EGP`, `47.5` → `47.50 EGP`. */
export function formatMoney(amount: number, currency = "EGP") {
  const text = Number.isInteger(amount) ? whole.format(amount) : fixed.format(amount);
  return `${text} ${currency}`;
}

/** Receipt-style amount without currency: `1850` → `1,850.00`. */
export function formatAmount(amount: number) {
  return fixed.format(amount);
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Formats seconds as `MM:SS`. Negative values clamp to zero. */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Splits a duration into days/hours/minutes/seconds for countdown tiles. */
export function splitDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3_600),
    minutes: Math.floor((s % 3_600) / 60),
    seconds: s % 60,
  };
}
