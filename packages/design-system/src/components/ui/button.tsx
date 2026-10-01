import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Slot } from "radix-ui"

/* Matchpass-tuned shadcn button: brand variants and 44px+ touch targets. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-sans font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none aria-disabled:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-sand disabled:text-muted-ink",
        primary: "bg-gold text-ink hover:bg-[#e0aa00] disabled:bg-sand disabled:text-muted-ink aria-disabled:bg-sand aria-disabled:text-muted-ink",
        pitch: "bg-pitch text-white hover:bg-pitch/90 disabled:bg-sand disabled:text-muted-ink",
        ink: "bg-ink text-white hover:bg-ink/85 disabled:bg-sand disabled:text-muted-ink",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-ink bg-white font-normal text-ink hover:bg-sand disabled:opacity-50",
        "outline-inverse": "border border-white bg-transparent font-medium text-white hover:bg-white/10",
        "outline-danger": "border border-rose-ink bg-white text-rose-ink hover:bg-rose-soft",
        "outline-warning": "border border-amber-ink bg-transparent text-amber-ink hover:bg-amber-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent text-pitch hover:bg-mint",
        link: "h-auto bg-transparent px-0 text-pitch underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-10 px-3.5 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
        xl: "h-[52px] px-6 text-base",
        "2xl": "h-14 px-9 text-[17px]",
        icon: "size-11",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      block: false,
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  block = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
