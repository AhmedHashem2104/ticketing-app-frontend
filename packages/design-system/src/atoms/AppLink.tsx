import { z } from "zod";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zFn, zHref, zNode } from "../lib/props";
import { useUI } from "../lib/provider";

export const appLinkPropsSchema = z.object({
  href: zHref,
  children: zNode,
  className: zClassName,
  external: z.boolean().optional(),
  current: z.boolean().optional(),
  tone: z.enum(["inherit", "pitch", "inverse", "muted"]).optional(),
  underline: z.boolean().optional(),
  "aria-label": z.string().min(1).optional(),
  onClick: zFn<(event: React.MouseEvent<HTMLAnchorElement>) => void>().optional(),
});

export type AppLinkProps = z.input<typeof appLinkPropsSchema>;

const tones = {
  inherit: "",
  pitch: "font-semibold text-pitch",
  inverse: "text-white",
  muted: "text-sub",
} as const;

/** Atom · AppLink — text link that routes through the host app's link component. */
export function AppLink(props: AppLinkProps) {
  validateProps("AppLink", appLinkPropsSchema, props);
  const { href, children, className, external, current, tone = "inherit", underline, ...rest } = props;
  const { LinkComponent, t } = useUI();
  const classes = cn(tones[tone], underline && "underline underline-offset-2", "hover:underline", className);
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
        <span className="sr-only"> {t("(opens in a new tab)")}</span>
      </a>
    );
  }
  return (
    <LinkComponent href={href} className={classes} aria-current={current ? "page" : undefined} {...rest}>
      {children}
    </LinkComponent>
  );
}
