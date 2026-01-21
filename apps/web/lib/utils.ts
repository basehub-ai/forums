import { type ClassValue, clsx } from "clsx"
import { formatDistanceStrict, formatDistanceToNowStrict } from "date-fns"
import { customAlphabet } from "nanoid"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_",
  21
)

export function getSiteOrigin() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
  }
  return "http://localhost:3000"
}

export function formatCompactNumber(n: number): string {
  if (n < 1000) {
    return n.toString()
  }
  if (n < 10_000) {
    const k = n / 1000
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
  }
  return `${Math.floor(n / 1000)}k`
}

export function formatRelativeTime(
  date: Date | number,
  now?: Date | number
): string {
  if (now !== undefined) {
    return formatDistanceStrict(date, now, { addSuffix: true })
  }
  return formatDistanceToNowStrict(date, { addSuffix: true })
}
