import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva("flex items-center justify-center font-medium", {
  variants: {
    variant: {
      primary:
        "bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50",
      secondary:
        "no-focus bg-accent/5 text-accent outline-dotted outline-2 outline-accent -outline-offset-1 hover:bg-accent/10 focus:outline-dashed focus:outline-2",
      tertiary: "bg-faint font-medium text-label uppercase",
    },
    size: {
      default: "h-9 px-3",
      sm: "h-8 px-2.5 text-sm",
      xs: "h-6 px-1.5 text-sm",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
})

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
