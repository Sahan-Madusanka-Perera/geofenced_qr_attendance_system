import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/* Controls on a departure board are signage: square, set in board type,
   tracked, and never in sentence case. */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border font-board font-semibold uppercase tracking-board whitespace-nowrap outline-none select-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-amber bg-amber text-board hover:bg-[hsl(var(--amber)/0.85)] hover:border-[hsl(var(--amber)/0.85)]",
        outline:
          "border-slat-edge bg-transparent text-char hover:border-char-faint hover:bg-slat-raised",
        secondary:
          "border-slat-edge bg-slat-raised text-char hover:bg-[hsl(var(--slat-edge))]",
        ghost:
          "border-transparent bg-transparent text-char-dim hover:bg-slat-raised hover:text-char",
        destructive:
          "border-[hsl(var(--red)/0.4)] bg-[hsl(var(--red)/0.12)] text-red hover:bg-[hsl(var(--red)/0.2)]",
        confirm:
          "border-green bg-green text-board hover:bg-[hsl(var(--green)/0.85)] hover:border-[hsl(var(--green)/0.85)]",
        link: "border-transparent text-amber underline underline-offset-4 hover:text-char",
      },
      size: {
        xs: "h-7 px-2 text-[10px]",
        sm: "h-8 px-3 text-[10px]",
        default: "h-9 px-4 text-[11px]",
        lg: "h-11 px-5 text-xs",
        icon: "size-9 px-0",
        "icon-sm": "size-8 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
