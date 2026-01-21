"use client"

import { useEffect, useState } from "react"
import { Tooltip } from "@/components/ui/tooltip"
import { cn, formatRelativeTime } from "@/lib/utils"

export function RelativeTime({
  timestamp,
  className,
}: {
  timestamp: number | Date
  className?: string
}) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const [relativeTime, setRelativeTime] = useState<string | null>(null)

  useEffect(() => {
    setRelativeTime(formatRelativeTime(timestamp))
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp))
    }, 1000)
    return () => clearInterval(interval)
  }, [timestamp])

  if (!relativeTime) {
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
