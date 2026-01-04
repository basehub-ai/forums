"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { useEffect, useState } from "react"
import { formatRelativeTime } from "@/lib/utils"

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

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger className={className}>{relativeTime}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{date.toISOString()}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
