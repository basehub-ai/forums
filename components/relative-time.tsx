"use client"

import { Tooltip } from "@base-ui/react/tooltip"
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
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{date.toISOString()}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
