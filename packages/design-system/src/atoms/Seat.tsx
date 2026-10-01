import { memo } from "react";
import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zColor, zFn } from "../lib/props";

export const seatStateValues = ["available", "selected", "taken", "wheelchair"] as const;
export type SeatState = (typeof seatStateValues)[number];

export const seatPropsSchema = z
  .object({
    state: z.enum(seatStateValues),
    number: z.number().int().positive(),
    label: z.string().min(1),
    size: z.enum(["sm", "md", "lg"]).optional(),
    wide: z.boolean().optional(),
    /** Tier colours for priced seat maps (concert hall); defaults to the green "available" style. */
    fill: zColor.optional(),
    edge: zColor.optional(),
    onFill: zColor.optional(),
    dimmed: z.boolean().optional(),
    onToggle: zFn<() => void>().optional(),
    /** Roving tab index managed by the parent seat map. */
    tabIndex: z.union([z.literal(0), z.literal(-1)]).optional(),
    seatId: z.string().min(1).optional(),
    className: zClassName,
  })
  .refine((p) => !(p.fill && !p.edge), { error: "A custom fill needs an edge colour", path: ["edge"] });

export type SeatProps = z.input<typeof seatPropsSchema>;

const sizes = {
  sm: "h-6 w-6 text-[9px] rounded-[6px_6px_3px_3px]",
  md: "h-7 w-7 text-[10px] rounded-[7px_7px_3px_3px]",
  lg: "h-[34px] w-[34px] text-[11px] rounded-[9px_9px_4px_4px]",
} as const;

function SeatImpl(props: SeatProps) {
  validateProps("Seat", seatPropsSchema, props);
  const { state, number, label, size = "md", wide, fill, edge, onFill, dimmed, onToggle, tabIndex, seatId, className } = props;
  const selected = state === "selected";
  const taken = state === "taken";
  const style = state === "available" && fill ? { backgroundColor: fill, borderColor: edge, color: onFill } : undefined;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      aria-disabled={taken || undefined}
      tabIndex={tabIndex}
      data-seat-id={seatId}
      onClick={taken ? undefined : onToggle}
      style={style}
      data-state={state}
      className={cn(
        "box-border shrink-0 border p-0 font-mono leading-none transition-[transform,opacity] hover:not-aria-disabled:scale-110",
        sizes[size],
        wide && "w-[70px]",
        state === "available" && !fill && "border-pitch bg-mint text-pitch",
        state === "available" && fill && "border",
        selected && "border-2 border-ink bg-gold text-ink",
        taken && "cursor-not-allowed border-sand bg-sand text-smoke",
        state === "wheelchair" && "border-2 border-dashed border-access bg-white text-access",
        dimmed && !selected && "opacity-25",
        className,
      )}
    >
      {selected ? number : taken ? "×" : null}
    </button>
  );
}

/** Atom · Seat — one selectable seat. Announces row, number, price and state. */
export const Seat = memo(SeatImpl);

/* ---------- Swatch (legend key) ---------- */

export const swatchPropsSchema = z.object({
  fill: zColor,
  border: z.enum(["none", "solid", "dashed"]).optional(),
  borderColor: zColor.optional(),
  shape: z.enum(["square", "seat", "bar"]).optional(),
  wide: z.boolean().optional(),
  mark: z.string().max(1).optional(),
  className: zClassName,
});

export type SwatchProps = z.input<typeof swatchPropsSchema>;

/** Atom · Swatch — colour key used in map legends (always paired with a text label). */
export function Swatch(props: SwatchProps) {
  validateProps("Swatch", swatchPropsSchema, props);
  const { fill, border = "none", borderColor, shape = "square", wide, mark, className } = props;
  return (
    <span
      aria-hidden="true"
      style={{
        backgroundColor: fill,
        borderColor,
        borderStyle: border === "none" ? undefined : border,
        borderWidth: border === "none" ? 0 : border === "dashed" ? 2 : 1,
      }}
      className={cn(
        "box-border inline-flex shrink-0 items-center justify-center text-[11px] text-smoke",
        shape === "square" && "size-4 rounded",
        shape === "seat" && "size-[18px] rounded-[5px_5px_2px_2px]",
        shape === "bar" && "h-10 w-3.5 rounded",
        wide && "w-[30px]",
        className,
      )}
    >
      {mark}
    </span>
  );
}
