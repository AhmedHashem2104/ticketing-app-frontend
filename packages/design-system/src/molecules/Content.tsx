import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { Avatar } from "../atoms/Identity";
import { Thumbnail } from "../atoms/Media";
import { Badge, badgeToneValues } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Spinner } from "../atoms/Feedback";
import { Swatch, swatchPropsSchema } from "../atoms/Seat";
import { Heading } from "../atoms/Typography";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { validateProps, zClassName, zFn, zNode } from "../lib/props";
import { cn } from "../lib/utils";
import { useI18n } from "../lib/provider";

/* ---------- Card ---------- */

export const cardPropsSchema = z.object({
  title: zNode.optional(),
  titleAs: z.enum(["h2", "h3"]).optional(),
  titleStyle: z.enum(["display", "sans"]).optional(),
  action: zNode.optional(),
  children: zNode,
  padding: z.enum(["md", "lg"]).optional(),
  radius: z.enum(["lg", "xl"]).optional(),
  as: z.enum(["section", "div", "article"]).optional(),
  "aria-label": z.string().min(1).optional(),
  className: zClassName,
});

export type CardProps = z.input<typeof cardPropsSchema>;

/** Molecule · Card — white panel with an optional display or sans title. */
export function Card(props: CardProps) {
  validateProps("Card", cardPropsSchema, props);
  const {
    title,
    titleAs = "h2",
    titleStyle = "display",
    action,
    children,
    padding = "lg",
    radius = "lg",
    as: Tag = "section",
    className,
    ...aria
  } = props;
  return (
    <Tag
      className={cn(
        "flex flex-col gap-3.5 border border-line bg-white",
        padding === "lg" ? "p-5 sm:p-6" : "p-4 sm:p-[22px]",
        radius === "lg" ? "rounded-xl" : "rounded-2xl",
        className,
      )}
      {...aria}
    >
      {title || action ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {title ? (
            <Heading as={titleAs} font={titleStyle} size={titleStyle === "display" ? "lg" : "xs"}>
              {title}
            </Heading>
          ) : null}
          {action}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

/* ---------- SummaryRow ---------- */

export const summaryRowPropsSchema = z.object({
  label: zNode,
  amount: z.number().finite(),
  variant: z.enum(["line", "total", "muted", "bonus"]).optional(),
  format: z.enum(["money", "amount"]).optional(),
  className: zClassName,
});

export type SummaryRowProps = z.input<typeof summaryRowPropsSchema>;

/** Molecule · SummaryRow — label / amount line in price summaries. */
export function SummaryRow(props: SummaryRowProps) {
  validateProps("SummaryRow", summaryRowPropsSchema, props);
  const { label, amount, variant = "line", format = "money", className } = props;
  const { f } = useI18n();
  const text =
    (amount < 0 ? "− " : variant === "bonus" ? "+" : "") + (format === "money" ? f.money(Math.abs(amount)) : f.amount(Math.abs(amount)));
  if (variant === "total") {
    return (
      <div className={cn("flex items-baseline justify-between border-t border-line pt-2.5", className)}>
        <span className="font-semibold">{label}</span>
        <span className="font-display text-[32px] leading-none font-extrabold">{text}</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex justify-between gap-3 text-[15px]",
        variant === "muted" && "text-muted-ink",
        variant === "bonus" && "text-pitch",
        className,
      )}
    >
      <span>{label}</span>
      <span className="font-mono">{text}</span>
    </div>
  );
}

/* ---------- Notice ---------- */

export const noticePropsSchema = z.object({
  tone: z.enum(["success", "warning", "danger", "info", "neutral"]),
  title: zNode.optional(),
  children: zNode.optional(),
  action: zNode.optional(),
  icon: z.boolean().optional(),
  live: z.enum(["polite", "assertive", "off"]).optional(),
  className: zClassName,
});

export type NoticeProps = z.input<typeof noticePropsSchema>;

const noticeTones = {
  success: { box: "bg-mint text-pitch", Icon: CheckCircle2 },
  warning: { box: "bg-amber-soft text-amber-ink", Icon: TriangleAlert },
  danger: { box: "bg-rose-soft text-rose-ink", Icon: AlertCircle },
  info: { box: "bg-lilac text-plum", Icon: Info },
  neutral: { box: "bg-paper text-sub", Icon: Info },
} as const;

/** Molecule · Notice — inline status message (approved Fan ID, postponed match, errors). */
export function Notice(props: NoticeProps) {
  validateProps("Notice", noticePropsSchema, props);
  const { tone, title, children, action, icon = true, live, className } = props;
  const { box, Icon } = noticeTones[tone];
  const role = live === "off" ? undefined : tone === "danger" || live === "assertive" ? "alert" : "status";
  return (
    <div role={role} className={cn("flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5 text-sm sm:items-center", box, className)}>
      {icon ? <Icon className="size-[22px] shrink-0" aria-hidden="true" /> : null}
      <div className="flex min-w-[min(100%,240px)] flex-1 flex-col gap-0.5 leading-normal">
        {title ? <strong className="font-semibold">{title}</strong> : null}
        {children ? <span>{children}</span> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------- FaqList ---------- */

export const faqListPropsSchema = z.object({
  items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
  className: zClassName,
});

export type FaqListProps = z.input<typeof faqListPropsSchema>;

/** Molecule · FaqList — accessible accordion of questions. */
export function FaqList(props: FaqListProps) {
  validateProps("FaqList", faqListPropsSchema, props);
  const { items, className } = props;
  return (
    <Accordion type="multiple" className={cn("flex flex-col gap-2", className)}>
      {items.map((item, i) => (
        <AccordionItem
          key={item.question}
          value={`faq-${i}`}
          className="rounded-[10px] border border-line bg-white px-[18px] last:border-b"
        >
          <AccordionTrigger className="py-3.5 text-[15px] font-semibold hover:no-underline">{item.question}</AccordionTrigger>
          <AccordionContent className="text-[15px] leading-normal text-sub">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/* ---------- Legend ---------- */

export const legendPropsSchema = z.object({
  items: z.array(z.object({ label: z.string().min(1), swatch: swatchPropsSchema })).min(1),
  label: z.string().min(1).optional(),
  bordered: z.boolean().optional(),
  className: zClassName,
});

export type LegendProps = z.input<typeof legendPropsSchema>;

/** Molecule · Legend — key for seat and zone maps. */
export function Legend(props: LegendProps) {
  validateProps("Legend", legendPropsSchema, props);
  const { t } = useI18n();
  const { items, label = t("Map key"), bordered, className } = props;
  return (
    <ul
      aria-label={label}
      className={cn(
        "m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-[13px] text-sub",
        bordered && "border-t border-line pt-3",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <Swatch {...item.swatch} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------- NumberedStep ---------- */

export const numberedStepPropsSchema = z.object({
  index: z.number().int().min(1).max(99),
  title: z.string().optional(),
  children: zNode,
  tone: z.enum(["card", "inverse"]).optional(),
  className: zClassName,
});

export type NumberedStepProps = z.input<typeof numberedStepPropsSchema>;

/** Molecule · NumberedStep — "01 · title · body" explainer used in what-happens-next lists. */
export function NumberedStep(props: NumberedStepProps) {
  validateProps("NumberedStep", numberedStepPropsSchema, props);
  const { index, title, children, tone = "card", className } = props;
  const number = String(index).padStart(2, "0");
  if (tone === "inverse") {
    return (
      <div className={cn("flex gap-3 text-sm leading-normal text-chalk", className)}>
        <span className="font-mono text-gold" aria-hidden="true">
          {number}
        </span>
        <span>{children}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl border border-line bg-white p-[18px]", className)}>
      <span className="font-mono text-pitch" aria-hidden="true">
        {number}
      </span>
      {title ? <span className="font-semibold">{title}</span> : null}
      <span className="text-sm leading-normal text-sub">{children}</span>
    </div>
  );
}

/* ---------- DetailList ---------- */

export const detailListPropsSchema = z.object({
  items: z.array(z.object({ label: z.string().min(1), value: zNode })).min(1),
  labelWidth: z.enum(["sm", "md"]).optional(),
  className: zClassName,
});

export type DetailListProps = z.input<typeof detailListPropsSchema>;

/** Molecule · DetailList — label / value pairs (refund review, gates). */
export function DetailList(props: DetailListProps) {
  validateProps("DetailList", detailListPropsSchema, props);
  const { items, labelWidth = "md", className } = props;
  return (
    <dl
      className={cn(
        "m-0 grid gap-x-4 gap-y-2.5 text-[15px]",
        labelWidth === "md" ? "grid-cols-[minmax(0,160px)_minmax(0,1fr)]" : "grid-cols-[auto_minmax(0,1fr)]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className={labelWidth === "md" ? "text-muted-ink" : "font-semibold"}>{item.label}</dt>
          <dd className={cn("m-0", labelWidth === "md" && "font-semibold")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- StatTile ---------- */

export const statTilePropsSchema = z.object({ label: z.string().min(1), value: z.string().min(1), className: zClassName });
export type StatTileProps = z.input<typeof statTilePropsSchema>;

/** Molecule · StatTile — big number with caption (people ahead, estimated wait). */
export function StatTile(props: StatTileProps) {
  validateProps("StatTile", statTilePropsSchema, props);
  const { label, value, className } = props;
  return (
    <div className={cn("rounded-[10px] bg-paper p-4", className)}>
      <div className="text-[13px] text-muted-ink">{label}</div>
      <div className="font-display text-[40px] leading-tight font-extrabold sm:text-[48px]">{value}</div>
    </div>
  );
}

/* ---------- HolderRow ---------- */

export const holderRowPropsSchema = z.object({
  initials: z.string().min(1).max(3),
  avatarUrl: z.string().min(1).optional(),
  name: z.string().min(1),
  detail: z.string().optional(),
  size: z.enum(["sm", "lg"]).optional(),
  bordered: z.boolean().optional(),
  trailing: zNode.optional(),
  className: zClassName,
});

export type HolderRowProps = z.input<typeof holderRowPropsSchema>;

/** Molecule · HolderRow — avatar, name and detail (ticket holders, account). */
export function HolderRow(props: HolderRowProps) {
  validateProps("HolderRow", holderRowPropsSchema, props);
  const { initials, avatarUrl, name, detail, size = "sm", bordered, trailing, className } = props;
  return (
    <div className={cn("flex items-center gap-3", bordered && "border-t border-line pt-2.5", className)}>
      <Avatar initials={initials} src={avatarUrl} size={size === "lg" ? "lg" : "sm"} />
      <span className="flex flex-1 flex-col">
        <span className={cn("font-semibold", size === "lg" ? "text-base" : "text-[15px]")}>{name}</span>
        {detail ? <span className="text-[13px] text-muted-ink">{detail}</span> : null}
      </span>
      {trailing}
    </div>
  );
}

/* ---------- ListingRow ---------- */

export const listingRowPropsSchema = z.object({
  title: z.string().min(1),
  detail: z.string().optional(),
  /** Event photo shown as a thumbnail before the title. */
  imageUrl: z.string().min(1).optional(),
  status: z.string().min(1),
  tone: z.enum(badgeToneValues),
  action: zNode.optional(),
  className: zClassName,
});

export type ListingRowProps = z.input<typeof listingRowPropsSchema>;

/** Molecule · ListingRow — title, detail and status pill (resale listings). */
export function ListingRow(props: ListingRowProps) {
  validateProps("ListingRow", listingRowPropsSchema, props);
  const { title, detail, imageUrl, status, tone, action, className } = props;
  return (
    <div className={cn("flex items-center justify-between gap-3 border-t border-line pt-2.5", className)}>
      {imageUrl ? <Thumbnail src={imageUrl} size="sm" /> : null}
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-semibold">{title}</span>
        {detail ? <span className="text-[13px] text-muted-ink">{detail}</span> : null}
      </span>
      <span className="flex items-center gap-2">
        <Badge tone={tone}>{status}</Badge>
        {action}
      </span>
    </div>
  );
}

/* ---------- Status states ---------- */

export const emptyStatePropsSchema = z.object({
  title: z.string().min(1),
  children: zNode.optional(),
  action: zNode.optional(),
  className: zClassName,
});
export type EmptyStateProps = z.input<typeof emptyStatePropsSchema>;

/** Molecule · EmptyState */
export function EmptyState(props: EmptyStateProps) {
  validateProps("EmptyState", emptyStatePropsSchema, props);
  const { title, children, action, className } = props;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-white px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="max-w-md text-sm text-muted-ink">{children}</div> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export const errorStatePropsSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1),
  onRetry: zFn<() => void>().optional(),
  className: zClassName,
});
export type ErrorStateProps = z.input<typeof errorStatePropsSchema>;

/** Molecule · ErrorState — failure message with retry. */
export function ErrorState(props: ErrorStateProps) {
  validateProps("ErrorState", errorStatePropsSchema, props);
  const { t } = useI18n();
  const { title = t("Something went wrong"), message, onRetry, className } = props;
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-2 rounded-xl border border-rose-soft bg-white px-6 py-10 text-center", className)}
    >
      <AlertCircle className="size-8 text-rose-ink" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-ink">{t(message)}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t("Try again")}
        </Button>
      ) : null}
    </div>
  );
}

export const loadingStatePropsSchema = z.object({ label: z.string().min(1).optional(), className: zClassName });
export type LoadingStateProps = z.input<typeof loadingStatePropsSchema>;

/** Molecule · LoadingState — centred spinner block. */
export function LoadingState(props: LoadingStateProps) {
  validateProps("LoadingState", loadingStatePropsSchema, props);
  const { t } = useI18n();
  const { label = t("Loading"), className } = props;
  return (
    <div className={cn("flex min-h-[240px] items-center justify-center", className)}>
      <Spinner size="lg" label={label} />
    </div>
  );
}
