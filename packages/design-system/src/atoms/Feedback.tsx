import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Progress } from "../components/ui/progress";
import { Separator as UISeparator } from "../components/ui/separator";
import { Skeleton as UISkeleton } from "../components/ui/skeleton";
import { cn } from "../lib/utils";
import { validateProps, zClassName } from "../lib/props";

/* ---------- ProgressBar ---------- */

export const progressBarPropsSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().min(1),
  tone: z.enum(["pitch", "gold", "ink"]).optional(),
  size: z.enum(["xs", "sm", "md"]).optional(),
  className: zClassName,
});

export type ProgressBarProps = z.input<typeof progressBarPropsSchema>;

const progressTones = { pitch: "[&>*]:bg-pitch", gold: "[&>*]:bg-gold", ink: "[&>*]:bg-ink" } as const;
const progressSizes = { xs: "h-1", sm: "h-1.5", md: "h-3" } as const;

/** Atom · ProgressBar — labelled determinate progress (queue position, QR refresh). */
export function ProgressBar(props: ProgressBarProps) {
  validateProps("ProgressBar", progressBarPropsSchema, props);
  const { value, label, tone = "pitch", size = "md", className } = props;
  return (
    <Progress
      value={value}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      className={cn(progressTones[tone], progressSizes[size], className)}
    />
  );
}

/* ---------- Spinner ---------- */

export const spinnerPropsSchema = z.object({
  label: z.string().min(1).optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  className: zClassName,
});
export type SpinnerProps = z.input<typeof spinnerPropsSchema>;

/** Atom · Spinner — indeterminate loading indicator announced politely. */
export function Spinner(props: SpinnerProps) {
  validateProps("Spinner", spinnerPropsSchema, props);
  const { label = "Loading", size = "md", className } = props;
  const px = { sm: "size-4", md: "size-6", lg: "size-10" }[size];
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-muted-ink", className)}>
      <Loader2 className={cn("animate-spin text-pitch", px)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ---------- Skeleton ---------- */

export const skeletonPropsSchema = z.object({ className: zClassName, rounded: z.enum(["md", "lg", "xl", "full"]).optional() });
export type SkeletonProps = z.input<typeof skeletonPropsSchema>;

/** Atom · Skeleton — placeholder block while content loads. */
export function Skeleton(props: SkeletonProps) {
  validateProps("Skeleton", skeletonPropsSchema, props);
  const { className, rounded = "lg" } = props;
  const radius = { md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" }[rounded];
  return <UISkeleton aria-hidden="true" className={cn("bg-sand", radius, className)} />;
}

/* ---------- Separator ---------- */

export const separatorPropsSchema = z.object({
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  decorative: z.boolean().optional(),
  dashed: z.boolean().optional(),
  className: zClassName,
});
export type SeparatorProps = z.input<typeof separatorPropsSchema>;

/** Atom · Separator */
export function Separator(props: SeparatorProps) {
  validateProps("Separator", separatorPropsSchema, props);
  const { dashed, className, decorative = true, ...rest } = props;
  return (
    <UISeparator
      decorative={decorative}
      className={cn("bg-line", dashed && "border-t border-dashed border-line-strong bg-transparent", className)}
      {...rest}
    />
  );
}
