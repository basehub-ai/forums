import { Slot } from "@radix-ui/react-slot"
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  )
}

export { Button, buttonVariants }
