import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";

export const chipPropsSchema = z.object({
  pressed: z.boolean(),
  onPressedChange: zFn<(pressed: boolean) => void>(),
  tone: z.enum(["ink", "plum"]).optional(),
  size: z.enum(["sm", "md"]).optional(),
  children: zNode,
  className: zClassName,
});

export type ChipProps = z.input<typeof chipPropsSchema>;

/** Atom · Chip — controlled toggle pill (category filters, price filters). */
export function Chip(props: ChipProps) {
  validateProps("Chip", chipPropsSchema, props);
  const { pressed, onPressedChange, tone = "ink", size = "md", children, className } = props;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "rounded-full border font-medium transition-colors",
        size === "md" ? "h-11 px-[18px] text-sm" : "h-10 px-3 text-[13px] font-semibold",
        pressed
          ? tone === "plum"
            ? "border-plum bg-plum text-white"
            : "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:border-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
