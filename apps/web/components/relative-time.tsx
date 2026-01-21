"use client"

import { useEffect, useState } from "react"
import { Tooltip } from "@/components/ui/tooltip"
import { cn, formatRelativeTime } from "@/lib/utils"

function isValidTimestamp(timestamp: unknown): timestamp is number | Date {
  if (timestamp === null || timestamp === undefined) return false
  if (timestamp instanceof Date) return !Number.isNaN(timestamp.getTime())
  if (typeof timestamp === "number")
    return (
      !Number.isNaN(timestamp) && Number.isFinite(timestamp) && timestamp > 0
    )
  return false
}

export function RelativeTime({
  timestamp,
  className,
}: {
  timestamp: number | Date | undefined | null
  className?: string
}) {
  const [relativeTime, setRelativeTime] = useState<string | null>(null)

  const isValid = isValidTimestamp(timestamp)
  const date = isValid
    ? timestamp instanceof Date
      ? timestamp
      : new Date(timestamp)
    : null

  useEffect(() => {
    if (!isValid) return
    setRelativeTime(formatRelativeTime(timestamp))
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp))
    }, 1000)
    return () => clearInterval(interval)
  }, [timestamp, isValid])

  if (!(isValid && relativeTime && date)) {
    return null
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger className={cn(className, "animate-fade-in")}>
          {relativeTime}
        </Tooltip.Trigger>
        <Tooltip.Popup>{date.toISOString()}</Tooltip.Popup>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
