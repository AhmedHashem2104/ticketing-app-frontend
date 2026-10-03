import { Sparkles } from "lucide-react";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { useUI } from "../lib/provider";
import { validateProps, zClassName, zFn } from "../lib/props";
import { cn } from "../lib/utils";

export const devAutofillButtonPropsSchema = z.object({
  onFill: zFn<() => void | Promise<void>>(),
  label: z.string().min(1).optional(),
  className: zClassName,
});
export type DevAutofillButtonProps = z.input<typeof devAutofillButtonPropsSchema>;

const noopSubscribe = () => () => {};
/** False during server rendering and hydration, true once React runs in the browser. */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * Atom · DevAutofillButton — fills the surrounding form with working sample data. Development only:
 * renders nothing unless `UIProvider` has `devTools` on (production builds always turn it off).
 */
export function DevAutofillButton(props: DevAutofillButtonProps) {
  validateProps("DevAutofillButton", devAutofillButtonPropsSchema, props);
  const { devTools, t } = useUI();
  // Rendered only after hydration so it's never clicked while it can't respond yet.
  const hydrated = useHydrated();
  const { onFill, label = t("Autofill"), className } = props;
  if (!devTools || !hydrated) return null;
  return (
    <button
      type="button"
      data-dev-autofill=""
      onClick={() => void onFill()}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-gold bg-gold/15 px-3 text-[13px] font-semibold text-ink",
        "hover:bg-gold/30 focus-visible:ring-[3px] focus-visible:ring-gold focus-visible:outline-none",
        className,
      )}
    >
      <Sparkles className="size-4" aria-hidden="true" />
      {label}
      <span className="rounded bg-ink px-1 font-mono text-[10px] font-bold tracking-wider text-gold uppercase">dev</span>
    </button>
  );
}
