import { z } from "zod";
import { validateProps, zClassName, zNode } from "../lib/props";
import { cn } from "../lib/utils";

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-lg bg-gold px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to main content
    </a>
  );
}

/* ---------- SiteLayout ---------- */

export const siteLayoutPropsSchema = z.object({
  header: zNode,
  footer: zNode.optional(),
  children: zNode,
  tone: z.enum(["paper", "pitch"]).optional(),
  className: zClassName,
});

export type SiteLayoutProps = z.input<typeof siteLayoutPropsSchema>;

/** Template · SiteLayout — skip link, header slot, `<main>` landmark and footer slot. */
export function SiteLayout(props: SiteLayoutProps) {
  validateProps("SiteLayout", siteLayoutPropsSchema, props);
  const { header, footer, children, tone = "paper", className } = props;
  return (
    <div className={cn("flex min-h-dvh flex-col", tone === "pitch" ? "bg-pitch" : "bg-paper", className)}>
      <SkipLink />
      {header}
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col pb-16 outline-none">
        {children}
      </main>
      {footer}
    </div>
  );
}

/* ---------- Container ---------- */

export const containerPropsSchema = z.object({
  width: z.enum(["page", "narrow", "focus"]).optional(),
  children: zNode,
  className: zClassName,
});

export type ContainerProps = z.input<typeof containerPropsSchema>;

/** Template · Container — centred page width with responsive gutters. */
export function Container(props: ContainerProps) {
  validateProps("Container", containerPropsSchema, props);
  const { width = "page", children, className } = props;
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-8",
        width === "page" ? "max-w-[1280px]" : width === "narrow" ? "max-w-[880px]" : "max-w-[680px] sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- TwoColumn ---------- */

export const twoColumnPropsSchema = z.object({
  children: zNode,
  aside: zNode,
  asideLabel: z.string().min(1).optional(),
  asideWidth: z.enum(["sm", "md", "lg"]).optional(),
  sticky: z.boolean().optional(),
  asideOffset: z.boolean().optional(),
  className: zClassName,
});

export type TwoColumnProps = z.input<typeof twoColumnPropsSchema>;

/** Template · TwoColumn — main column plus a (sticky) aside that wraps below on small screens. */
export function TwoColumn(props: TwoColumnProps) {
  validateProps("TwoColumn", twoColumnPropsSchema, props);
  const { children, aside, asideLabel, asideWidth = "md", sticky = true, asideOffset, className } = props;
  const basis = { sm: "flex-[0_1_380px]", md: "flex-[0_1_400px]", lg: "flex-[0_1_420px]" }[asideWidth];
  const AsideTag = asideLabel ? "aside" : "div";
  return (
    <div className={cn("flex flex-wrap items-start gap-7", className)}>
      <div className="flex min-w-[min(100%,560px)] flex-[1_1_620px] flex-col gap-6">{children}</div>
      <AsideTag
        aria-label={asideLabel}
        className={cn(
          "flex w-full min-w-[min(100%,300px)] flex-col gap-4",
          basis,
          sticky && "lg:sticky lg:top-6",
          asideOffset && "lg:pt-[60px]",
        )}
      >
        {aside}
      </AsideTag>
    </div>
  );
}

/* ---------- SplitLayout ---------- */

export const splitLayoutPropsSchema = z.object({
  panel: zNode,
  children: zNode,
  topRight: zNode.optional(),
  className: zClassName,
});

export type SplitLayoutProps = z.input<typeof splitLayoutPropsSchema>;

/** Template · SplitLayout — brand panel beside a focused form (sign up, log in). */
export function SplitLayout(props: SplitLayoutProps) {
  validateProps("SplitLayout", splitLayoutPropsSchema, props);
  const { panel, children, topRight, className } = props;
  return (
    <div className={cn("flex min-h-dvh flex-wrap bg-paper", className)}>
      <SkipLink />
      <div className="flex-[1_1_480px]">{panel}</div>
      <main id="main" tabIndex={-1} className="flex flex-[1_1_480px] justify-center px-6 py-10 outline-none sm:px-14 sm:py-12">
        <div className="flex w-full max-w-[460px] flex-col gap-[22px]">
          {topRight ? <div className="flex justify-end">{topRight}</div> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
