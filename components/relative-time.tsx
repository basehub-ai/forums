"use client"

import { Tooltip } from "@/components/ui/tooltip"
import { formatRelativeTime } from "@/lib/utils"

export function RelativeTime({
  timestamp,
  className,
}: {
  timestamp: number | Date
  className?: string
}) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger className={className}>
          {formatRelativeTime(timestamp)}
        </Tooltip.Trigger>
        <Tooltip.Popup>{date.toISOString()}</Tooltip.Popup>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
