import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"

const MESSAGE_LIMITS = { minute: 20, hour: 200, day: 400 }
const REACTION_LIMITS = { minute: 50, hour: 500, day: 2000 }
// Anonymous: 10/min, 100/day per IP
const REMOTE_BASH_LIMITS = { minute: 10, day: 100 }

const messageLimiters = {
  minute: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MESSAGE_LIMITS.minute, "1m"),
    prefix: "rl:msg:m",
  }),
  hour: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MESSAGE_LIMITS.hour, "1h"),
    prefix: "rl:msg:h",
  }),
  day: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MESSAGE_LIMITS.day, "1d"),
    prefix: "rl:msg:d",
  }),
}

const reactionLimiters = {
  minute: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REACTION_LIMITS.minute, "1m"),
    prefix: "rl:react:m",
  }),
  hour: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REACTION_LIMITS.hour, "1h"),
    prefix: "rl:react:h",
  }),
  day: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REACTION_LIMITS.day, "1d"),
    prefix: "rl:react:d",
  }),
}

const remoteBashLimiters = {
  minute: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REMOTE_BASH_LIMITS.minute, "1m"),
    prefix: "rl:rbash:m",
  }),
  day: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REMOTE_BASH_LIMITS.day, "1d"),
    prefix: "rl:rbash:d",
  }),
}

export async function checkMessageRateLimit(userId: string) {
  const [m, h, d] = await Promise.all([
    messageLimiters.minute.limit(userId),
    messageLimiters.hour.limit(userId),
    messageLimiters.day.limit(userId),
  ])
  if (!(m.success && h.success && d.success)) {
    throw new Error("Rate limit exceeded")
  }
}

export async function checkReactionRateLimit(userId: string) {
  const [m, h, d] = await Promise.all([
    reactionLimiters.minute.limit(userId),
    reactionLimiters.hour.limit(userId),
    reactionLimiters.day.limit(userId),
  ])
  if (!(m.success && h.success && d.success)) {
    throw new Error("Rate limit exceeded")
  }
}

export async function checkRemoteBashRateLimit(ip: string): Promise<{
  success: boolean
  reset: number
}> {
  const [m, d] = await Promise.all([
    remoteBashLimiters.minute.limit(ip),
    remoteBashLimiters.day.limit(ip),
  ])

  if (!m.success) {
    return { success: false, reset: m.reset }
  }
  if (!d.success) {
    return { success: false, reset: d.reset }
  }

  return { success: true, reset: 0 }
}
