import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { z } from "zod";
import { Button as UIButton, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";
import { validateProps, zClassName, zHref, zNode } from "../lib/props";
import { useUI } from "../lib/provider";

export const buttonVariantValues = [
  "default",
  "primary",
  "pitch",
  "ink",
  "destructive",
  "outline",
  "outline-inverse",
  "outline-danger",
  "outline-warning",
  "secondary",
  "ghost",
  "link",
] as const;
export const buttonSizeValues = ["default", "sm", "md", "lg", "xl", "2xl", "icon", "icon-sm", "icon-lg"] as const;

const sharedSchema = z.object({
  variant: z.enum(buttonVariantValues).optional(),
  size: z.enum(buttonSizeValues).optional(),
  block: z.boolean().optional(),
  className: zClassName,
  children: zNode.optional(),
});

export const buttonPropsSchema = sharedSchema
  .extend({
    loading: z.boolean().optional(),
    loadingText: z.string().min(1).optional(),
    asChild: z.boolean().optional(),
    type: z.enum(["button", "submit", "reset"]).optional(),
    "aria-label": z.string().min(1).optional(),
  })
  .refine((props) => !(props.size?.startsWith("icon") && !props["aria-label"]), {
    error: "Icon buttons need an aria-label",
    path: ["aria-label"],
  });

export type ButtonProps = Omit<ComponentProps<"button">, "type"> & z.input<typeof buttonPropsSchema>;

/**
 * Atom · Button — Matchpass action button built on the shadcn/ui primitive.
 * `primary` is the gold call to action; `pitch` the solid green confirm action.
 */
export function Button(props: ButtonProps) {
  validateProps("Button", buttonPropsSchema, props);
  const { loading = false, loadingText, children, disabled, type = "button", ...rest } = props;
  return (
    <UIButton type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </UIButton>
  );
}

export const linkButtonPropsSchema = sharedSchema.extend({
  href: zHref,
  "aria-current": z.enum(["page", "step"]).optional(),
  "aria-label": z.string().min(1).optional(),
  disabled: z.boolean().optional(),
});

export type LinkButtonProps = z.input<typeof linkButtonPropsSchema>;

/** Atom · LinkButton — navigation styled as a button (uses the app's router link). */
export function LinkButton(props: LinkButtonProps) {
  validateProps("LinkButton", linkButtonPropsSchema, props);
  const { href, variant = "primary", size = "xl", block, className, children, disabled, ...aria } = props;
  const { LinkComponent } = useUI();
  const classes = cn(buttonVariants({ variant, size, block }), className);
  if (disabled) {
    return (
      <span role="link" aria-disabled="true" className={classes} {...aria}>
        {children}
      </span>
    );
  }
  return (
    <LinkComponent href={href} className={classes} {...aria}>
      {children}
    </LinkComponent>
  );
}
