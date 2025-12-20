import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export type StoredInterrupt = {
  timestamp: number;
};

// Sandbox deduplication

const SANDBOX_VERSION = "v2"; // Increment to invalidate all existing sandboxes

export type StoredSandbox = {
  sandboxId: string;
  createdAt: number;
};

const sandboxKey = (owner: string, repo: string) =>
  `sandbox:${SANDBOX_VERSION}:${owner}:${repo}`;
const sandboxLockKey = (owner: string, repo: string) =>
  `sandbox:${SANDBOX_VERSION}:${owner}:${repo}:lock`;

/**
 * Atomically get existing sandboxId or acquire creation lock.
 * Uses Lua script for atomicity - prevents race conditions during sandbox creation.
 */
export async function getOrLockSandbox(
  owner: string,
  repo: string,
  lockTtlMs = 30_000,
): Promise<
  | { type: "existing"; sandboxId: string }
  | { type: "create"; lockAcquired: true }
  | { type: "locked" }
> {
  const dataKey = sandboxKey(owner, repo);
  const lockKey = sandboxLockKey(owner, repo);
  const lockTtlSeconds = Math.ceil(lockTtlMs / 1000);

  // Lua script: atomically check data key, then check/set lock
  const result = await redis.eval(
    `-- Check if sandbox data exists
    local sandboxData = redis.call('GET', KEYS[1])
    if sandboxData then
      return sandboxData
    end

    -- No data, try to acquire lock
    local lockAcquired = redis.call('SET', KEYS[2], '1', 'NX', 'EX', ARGV[1])
    if lockAcquired then
      return 'LOCK_ACQUIRED'
    else
      return 'LOCKED'
    end`,
    [dataKey, lockKey],
    [String(lockTtlSeconds)],
  );

  if (result === "LOCK_ACQUIRED") {
    return { type: "create", lockAcquired: true };
  }
  if (result === "LOCKED") {
    return { type: "locked" };
  }
  if (result) {
    // Upstash Redis may auto-deserialize JSON, handle both cases
    const parsed =
      typeof result === "string"
        ? (JSON.parse(result) as StoredSandbox)
        : (result as StoredSandbox);
    return { type: "existing", sandboxId: parsed.sandboxId };
  }
  // Should never happen due to Lua logic, but handle gracefully
  return { type: "locked" };
}

/**
 * Store sandboxId after successful creation and release lock.
 * Uses Lua script to atomically: store data + delete lock
 */
export async function storeSandbox(
  owner: string,
  repo: string,
  sandboxId: string,
  ttlMs = 600_000, // 10 minutes
): Promise<void> {
  const dataKey = sandboxKey(owner, repo);
  const lockKey = sandboxLockKey(owner, repo);
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  const data: StoredSandbox = {
    sandboxId,
    createdAt: Date.now(),
  };

  // Atomically store data and release lock
  await redis.eval(
    `redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    redis.call('DEL', KEYS[2])
    return 1`,
    [dataKey, lockKey],
    [JSON.stringify(data), String(ttlSeconds)],
  );
}

/**
 * Remove stale sandboxId from Redis.
 * Uses compare-and-delete pattern to prevent removing newer sandboxes.
 */
export async function removeSandboxIf(
  owner: string,
  repo: string,
  expectedSandboxId: string,
): Promise<boolean> {
  const dataKey = sandboxKey(owner, repo);

  // Only delete if it still contains the stale sandboxId
  const result = (await redis.eval(
    `local current = redis.call('GET', KEYS[1])
    if current then
      local parsed = cjson.decode(current)
      if parsed.sandboxId == ARGV[1] then
        redis.call('DEL', KEYS[1])
        return 1
      end
    end
    return 0`,
    [dataKey],
    [expectedSandboxId],
  )) as number;

  return result === 1;
}

/**
 * Extend TTL when sandbox timeout is extended.
 */
export async function extendSandboxTTL(
  owner: string,
  repo: string,
  ttlMs = 600_000, // 10 minutes
): Promise<void> {
  const dataKey = sandboxKey(owner, repo);
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  await redis.expire(dataKey, ttlSeconds);
}

/**
 * Release creation lock if sandbox creation fails.
 */
export async function releaseSandboxLock(
  owner: string,
  repo: string,
): Promise<void> {
  const lockKey = sandboxLockKey(owner, repo);
  await redis.del(lockKey);
}
