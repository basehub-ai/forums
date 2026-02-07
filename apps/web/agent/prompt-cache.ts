import type { JSONValue, LanguageModel, ModelMessage } from "ai"

/**
 * Prompt caching utilities for reducing token costs and latency.
 *
 * ## Anthropic
 * Marks system messages and the last conversation message with
 * `cacheControl: { type: "ephemeral" }` so Anthropic caches the
 * prefix incrementally. Cached tokens cost 10% of input tokens
 * (cache writes cost 25% more). Minimum cacheable length varies
 * by model (1024–4096 tokens).
 *
 * ## OpenAI
 * OpenAI automatically caches prompts ≥ 1024 tokens. We set a
 * `promptCacheKey` per post to improve cache routing (requests
 * sharing the same key + prefix hash are routed to the same server).
 *
 * Inspired by:
 * - vercel/ai SDK cookbook: https://ai-sdk.dev/cookbook/node/dynamic-prompt-caching
 * - anomalyco/opencode ProviderTransform.applyCaching
 */

// ─── Provider detection ──────────────────────────────────────────────

function isAnthropicModel(model: string | LanguageModel): boolean {
  if (typeof model === "string") {
    return model.includes("anthropic") || model.includes("claude")
  }
  return (
    model.provider === "anthropic" ||
    model.provider.includes("anthropic") ||
    model.modelId.includes("anthropic") ||
    model.modelId.includes("claude")
  )
}

function isOpenAIModel(model: string | LanguageModel): boolean {
  if (typeof model === "string") {
    return (
      model.includes("openai") ||
      model.includes("gpt-") ||
      model.includes("o1-") ||
      model.includes("o3-") ||
      model.includes("o4-")
    )
  }
  return (
    model.provider === "openai" ||
    model.provider.includes("openai") ||
    model.modelId.includes("gpt-") ||
    model.modelId.includes("o1-") ||
    model.modelId.includes("o3-") ||
    model.modelId.includes("o4-")
  )
}

// ─── Anthropic caching ───────────────────────────────────────────────

const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: "ephemeral" } },
} satisfies Record<string, Record<string, JSONValue>>

/**
 * Apply Anthropic prompt caching breakpoints to messages.
 *
 * Strategy (mirrors opencode's applyCaching):
 * 1. Mark up to the first 2 system messages (static instructions)
 * 2. Mark the last 2 non-system messages (conversation frontier)
 *
 * Anthropic allows a max of 4 cache breakpoints per request.
 * The AI SDK translates message-level providerOptions to block-level
 * cache_control automatically.
 */
function applyAnthropicCaching(messages: ModelMessage[]): ModelMessage[] {
  // Identify system messages and non-system messages
  const systemIndices: number[] = []
  const nonSystemIndices: number[] = []

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "system") {
      systemIndices.push(i)
    } else {
      nonSystemIndices.push(i)
    }
  }

  // Pick indices to cache: first 2 system + last 2 non-system = max 4 breakpoints
  const cacheIndices = new Set<number>([
    ...systemIndices.slice(0, 2),
    ...nonSystemIndices.slice(-2),
  ])

  return messages.map((message, index) => {
    if (!cacheIndices.has(index)) return message

    return {
      ...message,
      providerOptions: {
        ...message.providerOptions,
        ...ANTHROPIC_CACHE_CONTROL,
      },
    }
  })
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Apply prompt caching to messages based on the model provider.
 *
 * - **Anthropic**: adds `cacheControl` breakpoints on system messages and
 *   the last conversation messages (up to 4 breakpoints).
 * - **OpenAI**: returns messages unchanged (caching is automatic; use
 *   `getProviderOptions` to set `promptCacheKey`).
 * - **Other providers**: messages pass through unchanged.
 */
export function addCacheControlToMessages({
  messages,
  model,
}: {
  messages: ModelMessage[]
  model: string | LanguageModel
}): ModelMessage[] {
  if (messages.length === 0) return messages

  if (isAnthropicModel(model)) {
    return applyAnthropicCaching(messages)
  }

  // Other providers: return unchanged
  return messages
}

/**
 * Build provider-level options for prompt caching.
 *
 * - **OpenAI**: sets `promptCacheKey` to improve cache hit routing.
 * - **Anthropic / others**: returns undefined (caching is message-level).
 */
export function getCacheProviderOptions({
  model,
  postId,
}: {
  model: string | LanguageModel
  postId?: string
}): Record<string, Record<string, JSONValue>> | undefined {
  if (isOpenAIModel(model) && postId) {
    return {
      openai: {
        promptCacheKey: `forums-${postId}`,
      },
    }
  }

  return undefined
}
