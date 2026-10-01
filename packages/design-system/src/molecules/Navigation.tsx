import { Check } from "lucide-react";
import { z } from "zod";
import { Chip } from "../atoms/Chip";
import { validateProps, zClassName, zFn, zHref } from "../lib/props";
import { useUI } from "../lib/provider";
import { cn } from "../lib/utils";

const optionSchema = z.object({ value: z.string().min(1), label: z.string().min(1) });

/* ---------- SegmentedControl ---------- */

export const segmentedControlPropsSchema = z
  .object({
    label: z.string().min(1),
    options: z.array(optionSchema).min(2),
    value: z.string(),
    onValueChange: zFn<(value: string) => void>(),
    stretch: z.boolean().optional(),
    className: zClassName,
  })
  .refine((p) => p.options.some((o) => o.value === p.value), { error: "value must match one of the options", path: ["value"] });

export type SegmentedControlProps = z.input<typeof segmentedControlPropsSchema>;

/** Molecule · SegmentedControl — controlled pill toggle (Matches / Concerts & events). */
export function SegmentedControl(props: SegmentedControlProps) {
  validateProps("SegmentedControl", segmentedControlPropsSchema, props);
  const { label, options, value, onValueChange, stretch, className } = props;
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-1 self-start rounded-[10px] bg-sand p-1", stretch && "self-stretch", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "h-11 rounded-lg px-[18px] text-[15px] font-semibold transition-colors sm:px-[22px]",
              stretch && "flex-1",
              active ? "bg-white text-ink shadow-xs" : "bg-transparent text-sub hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- SegmentedNav ---------- */

export const segmentedNavPropsSchema = z.object({
  label: z.string().min(1),
  items: z.array(z.object({ href: zHref, label: z.string().min(1), current: z.boolean().optional() })).min(2),
  size: z.enum(["sm", "md"]).optional(),
  className: zClassName,
});

export type SegmentedNavProps = z.input<typeof segmentedNavPropsSchema>;

/** Molecule · SegmentedNav — pill-styled navigation between sibling pages (Upcoming / Past / Refunds). */
export function SegmentedNav(props: SegmentedNavProps) {
  validateProps("SegmentedNav", segmentedNavPropsSchema, props);
  const { label, items, size = "md", className } = props;
  const { LinkComponent } = useUI();
  return (
    <nav aria-label={label} className={cn("flex gap-1 rounded-[10px] bg-sand p-1", className)}>
      {items.map((item) => (
        <LinkComponent
          key={item.href + item.label}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "flex items-center rounded-lg font-semibold",
            size === "md" ? "h-11 px-[18px] text-[15px]" : "h-10 px-4 text-sm",
            item.current ? "bg-white text-ink" : "text-sub hover:text-ink",
          )}
        >
          {item.label}
        </LinkComponent>
      ))}
    </nav>
  );
}

/* ---------- ChipGroup ---------- */

export const chipGroupPropsSchema = z.object({
  label: z.string().min(1),
  options: z.array(optionSchema).min(1),
  value: z.string(),
  onValueChange: zFn<(value: string) => void>(),
  tone: z.enum(["ink", "plum"]).optional(),
  size: z.enum(["sm", "md"]).optional(),
  className: zClassName,
});

export type ChipGroupProps = z.input<typeof chipGroupPropsSchema>;

/** Molecule · ChipGroup — single-select chips (category and price filters). */
export function ChipGroup(props: ChipGroupProps) {
  validateProps("ChipGroup", chipGroupPropsSchema, props);
  const { label, options, value, onValueChange, tone, size, className } = props;
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Chip
          key={option.value}
          pressed={option.value === value}
          onPressedChange={() => onValueChange(option.value)}
          tone={tone}
          size={size}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

/* ---------- StepProgress ---------- */

export const stepProgressPropsSchema = z
  .object({
    steps: z.array(z.string().min(1)).min(2),
    current: z.number().int().min(1),
    label: z.string().min(1).optional(),
    className: zClassName,
  })
  .refine((p) => p.current <= p.steps.length, { error: "current is past the last step", path: ["current"] });

export type StepProgressProps = z.input<typeof stepProgressPropsSchema>;

/** Molecule · StepProgress — segmented progress for multi-step flows (Fan ID, refunds). */
export function StepProgress(props: StepProgressProps) {
  validateProps("StepProgress", stepProgressPropsSchema, props);
  const { steps, current, label = "Steps", className } = props;
  return (
    <ol
      aria-label={label}
      className={cn("m-0 grid list-none gap-1.5 p-0", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, i) => {
        const n = i + 1;
        const done = n <= current;
        return (
          <li
            key={step}
            aria-current={n === current ? "step" : undefined}
            className={cn("flex flex-col gap-1.5 text-[13px] font-semibold", done ? "text-pitch" : "text-muted-ink")}
          >
            <span aria-hidden="true" className={cn("h-1.5 rounded-[3px]", done ? "bg-pitch" : "bg-line")} />
            <span>
              {step}
              <span className="sr-only">{n < current ? " (completed)" : n === current ? " (current step)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- CheckoutSteps ---------- */

export const checkoutStepsPropsSchema = z.object({
  current: z.number().int().min(1).max(3),
  accent: z.enum(["pitch", "plum"]).optional(),
  className: zClassName,
});

export type CheckoutStepsProps = z.input<typeof checkoutStepsPropsSchema>;

const CHECKOUT_STEPS = ["Tickets", "Payment", "Done"];

/** Molecule · CheckoutSteps — the 1 Tickets · 2 Payment · 3 Done pill tracker. */
export function CheckoutSteps(props: CheckoutStepsProps) {
  validateProps("CheckoutSteps", checkoutStepsPropsSchema, props);
  const { current, accent = "pitch", className } = props;
  return (
    <ol aria-label="Checkout progress" className={cn("m-0 flex list-none gap-2 p-0 text-sm", className)}>
      {CHECKOUT_STEPS.map((step, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-1 rounded-2xl px-3.5 py-2 whitespace-nowrap",
              state === "done" && "bg-mint text-pitch",
              state === "current" && (accent === "plum" ? "bg-plum font-semibold text-white" : "bg-pitch font-semibold text-white"),
              state === "todo" && "bg-sand text-sub",
            )}
          >
            {n} {step}
            {state === "done" ? (
              <>
                <Check className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(completed)</span>
              </>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
