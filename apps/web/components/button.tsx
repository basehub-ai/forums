import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva("flex items-center justify-center font-medium", {
  variants: {
    variant: {
      primary:
        "cursor-pointer bg-accent text-white disabled:cursor-not-allowed disabled:opacity-50",
      secondary:
        "cursor-pointer bg-accent/10 text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50",
      tertiary:
        "cursor-pointer bg-faint font-medium text-label uppercase disabled:cursor-not-allowed disabled:opacity-50",
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
