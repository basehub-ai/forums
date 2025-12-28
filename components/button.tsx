import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva("flex items-center justify-center font-medium", {
  variants: {
    variant: {
      primary: "bg-accent text-background",
      secondary:
        "no-focus -outline-offset-1 bg-accent/5 text-accent outline-dashed outline-2 outline-accent hover:bg-accent/10 focus:outline-solid",
    },
    size: {
      default: "h-9 px-3 py-2 has-[>svg]:px-3",
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
