import { useMemo } from "react";
import { encode } from "uqr";
import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zColor } from "../lib/props";
import { useI18n } from "../lib/provider";

/* ---------- QRCode ---------- */

export const qrCodePropsSchema = z.object({
  value: z.string().min(1).max(512),
  size: z.number().int().min(48).max(512).optional(),
  label: z.string().min(1).optional(),
  className: zClassName,
});

export type QRCodeProps = z.input<typeof qrCodePropsSchema>;

/** Atom · QRCode — a real, scannable QR code rendered as crisp SVG. */
export function QRCode(props: QRCodeProps) {
  validateProps("QRCode", qrCodePropsSchema, props);
  const { t } = useI18n();
  const { value, size = 231, label = t("Ticket QR code"), className } = props;
  const { path, count } = useMemo(() => {
    const { data } = encode(value, { ecc: "M", border: 0 });
    let d = "";
    data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { path: d, count: data.length };
  }, [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`-1 -1 ${count + 2} ${count + 2}`}
      shapeRendering="crispEdges"
      className={cn("bg-white", className)}
    >
      <rect x={-1} y={-1} width={count + 2} height={count + 2} fill="#ffffff" />
      <path d={path} fill="#121512" />
    </svg>
  );
}

/* ---------- Barcode ---------- */

export const barcodePropsSchema = z.object({
  value: z.string().min(1),
  color: zColor.optional(),
  background: zColor.optional(),
  className: zClassName,
});

export type BarcodeProps = z.input<typeof barcodePropsSchema>;

/** Atom · Barcode — decorative linear code printed on the stub ticket. */
export function Barcode(props: BarcodeProps) {
  validateProps("Barcode", barcodePropsSchema, props);
  const { t } = useI18n();
  const { value, color = "#FFFFFF", background = "#121512", className } = props;
  const bars = useMemo(() => {
    const widths: number[] = [];
    for (const char of value.repeat(4)) widths.push((char.charCodeAt(0) % 3) + 1, ((char.charCodeAt(0) >> 2) % 2) + 1);
    return widths.slice(0, 64);
  }, [value]);
  let x = 0;
  return (
    <div
      role="img"
      aria-label={t("Barcode {value}", { value })}
      className={cn("h-11 rounded-[5px] px-2 py-1.5", className)}
      style={{ background }}
    >
      <svg width="100%" height="32" viewBox={`0 0 ${bars.reduce((a, b) => a + b, 0)} 32`} preserveAspectRatio="none" aria-hidden="true">
        {bars.map((w, i) => {
          const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={32} fill={color} /> : null;
          x += w;
          return rect;
        })}
      </svg>
    </div>
  );
}
