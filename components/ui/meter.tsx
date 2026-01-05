"use client"

import { Meter as BaseMeter } from "@base-ui/react/meter"
import { cn } from "@/lib/utils"

function Root({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Root>) {
  return (
    <BaseMeter.Root
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    />
  )
}

function Label({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Label>) {
  return (
    <BaseMeter.Label
      className={cn("text-muted text-xs", className)}
      {...props}
    />
  )
}

function Track({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Track>) {
  return (
    <BaseMeter.Track
      className={cn(
        "relative h-1.5 w-full overflow-hidden border border-border-solid bg-shade",
        className
      )}
      {...props}
    />
  )
}

function Indicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Indicator>) {
  return (
    <BaseMeter.Indicator
      className={cn("h-full bg-dim transition-all duration-300", className)}
      {...props}
    />
  )
}

function Value({
  className,
  ...props
}: React.ComponentProps<typeof BaseMeter.Value>) {
  return (
    <BaseMeter.Value
      className={cn("text-right text-muted text-xs tabular-nums", className)}
      {...props}
    />
  )
}

export const Meter = {
  Root,
  Label,
  Track,
  Indicator,
  Value,
}
