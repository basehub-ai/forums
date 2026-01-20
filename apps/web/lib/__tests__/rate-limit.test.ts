import { describe, expect, test } from "bun:test"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

describe("rate limiting", () => {
  const testUserId = `test-user-${Date.now()}`

  test("blocks after exceeding limit", async () => {
    const redis = Redis.fromEnv()
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1m"),
      prefix: "rl:test",
    })

    // First 3 should succeed
    for (let i = 0; i < 3; i++) {
      const result = await limiter.limit(testUserId)
      expect(result.success).toBe(true)
    }

    // 4th should fail
    const result = await limiter.limit(testUserId)
    expect(result.success).toBe(false)

    // Cleanup
    await redis.del(`rl:test:${testUserId}`)
  })
})
