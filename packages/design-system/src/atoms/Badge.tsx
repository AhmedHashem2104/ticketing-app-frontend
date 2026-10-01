import type { SaleStatus, ZoneAvailability } from "@repo/contracts";
import { z } from "zod";
import { Badge as UIBadge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zNode } from "../lib/props";

export const badgeToneValues = ["success", "warning", "danger", "neutral", "gold", "inverse", "info"] as const;
export type BadgeTone = (typeof badgeToneValues)[number];

export const badgePropsSchema = z.object({
  tone: z.enum(badgeToneValues).optional(),
  size: z.enum(["sm", "md"]).optional(),
  className: zClassName,
  children: zNode,
});

export type BadgeProps = z.input<typeof badgePropsSchema>;

/** Atom · Badge — status pill (On sale, Few left, Refunded…). */
export function Badge(props: BadgeProps) {
  validateProps("Badge", badgePropsSchema, props);
  const { tone = "neutral", size = "sm", className, children } = props;
  return (
    <UIBadge variant={tone} className={cn(size === "md" && "px-3 py-1.5 text-[13px]", className)}>
      {children}
    </UIBadge>
  );
}

/** Maps a sale status to the pill tone used across listings. */
export const saleStatusTone: Record<SaleStatus, BadgeTone> = {
  on_sale: "success",
  few_left: "warning",
  presale: "warning",
  queue: "warning",
  sold_out: "danger",
  coming_soon: "neutral",
};

/** Text colour for availability labels in price tables. */
export const availabilityText: Record<ZoneAvailability, string> = {
  available: "text-pitch",
  few_left: "text-warn",
  high_demand: "text-warn",
  restricted: "text-sub",
  sold_out: "text-rose-ink",
};
