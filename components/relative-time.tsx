"use client"

import { formatRelativeTime } from "@/lib/utils"

export function RelativeTime({
  timestamp,
  className,
}: {
  timestamp: number | Date
  className?: string
}) {
  return <span className={className}>{formatRelativeTime(timestamp)}</span>
}
