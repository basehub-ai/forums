import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva("flex items-center justify-center font-medium", {
  variants: {
    variant: {
      primary: "bg-accent text-white",
      secondary:
        "no-focus bg-accent/5 text-accent outline-dashed outline-2 outline-accent -outline-offset-1 hover:bg-accent/10 focus:outline-solid",
    },
    size: {
      default: "h-9 px-3",
      sm: "h-8 px-2.5 text-sm",
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
