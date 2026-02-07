import { describe, expect, test } from "bun:test"
import type { ModelMessage } from "ai"
import {
  addCacheControlToMessages,
  getCacheProviderOptions,
} from "../prompt-cache"

// ─── Helpers ─────────────────────────────────────────────────────────

function systemMsg(text: string): ModelMessage {
  return { role: "system", content: text }
}

function userMsg(text: string): ModelMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
  }
}

function assistantMsg(text: string): ModelMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
  }
}

function toolMsg(): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "Read",
        output: { type: "text", value: "file contents" },
      },
    ],
  }
}

const EPHEMERAL = { anthropic: { cacheControl: { type: "ephemeral" } } }

// ─── addCacheControlToMessages ───────────────────────────────────────

describe("addCacheControlToMessages", () => {
  describe("Anthropic models", () => {
    const anthropicModels = [
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
    ]

    for (const model of anthropicModels) {
      test(`adds cache control for ${model}`, () => {
        const messages: ModelMessage[] = [
          systemMsg("You are a helpful assistant."),
          userMsg("Hello"),
          assistantMsg("Hi there!"),
          userMsg("Tell me about caching"),
        ]

        const result = addCacheControlToMessages({ messages, model })

        // System message (index 0) should have cache control
        expect(result[0].providerOptions).toEqual(EPHEMERAL)

        // First user message (index 1) should NOT have cache control
        // (only last 2 non-system messages get it)
        expect(result[1].providerOptions).toBeUndefined()

        // Last 2 non-system messages should have cache control
        expect(result[2].providerOptions).toEqual(EPHEMERAL)
        expect(result[3].providerOptions).toEqual(EPHEMERAL)
      })
    }

    test("handles empty messages array", () => {
      const result = addCacheControlToMessages({
        messages: [],
        model: "anthropic/claude-sonnet-4.5",
      })
      expect(result).toEqual([])
    })

    test("handles single system message", () => {
      const messages: ModelMessage[] = [
        systemMsg("System prompt"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "anthropic/claude-sonnet-4.5",
      })

      expect(result[0].providerOptions).toEqual(EPHEMERAL)
    })

    test("handles 2 system messages", () => {
      const messages: ModelMessage[] = [
        systemMsg("System part 1"),
        systemMsg("System part 2"),
        userMsg("Hello"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "anthropic/claude-sonnet-4.5",
      })

      // Both system messages should be cached
      expect(result[0].providerOptions).toEqual(EPHEMERAL)
      expect(result[1].providerOptions).toEqual(EPHEMERAL)
      // User message is the only non-system message, so it's one of last 2
      expect(result[2].providerOptions).toEqual(EPHEMERAL)
    })

    test("respects max 4 breakpoints with long conversations", () => {
      const messages: ModelMessage[] = [
        systemMsg("System prompt"),
        systemMsg("Additional system context"),
        userMsg("First question"),
        assistantMsg("First answer"),
        userMsg("Second question"),
        assistantMsg("Second answer"),
        userMsg("Third question"),
        assistantMsg("Third answer"),
        userMsg("Fourth question"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "anthropic/claude-sonnet-4.5",
      })

      // Count cache breakpoints
      let breakpoints = 0
      for (const msg of result) {
        if (msg.providerOptions?.anthropic) breakpoints++
      }

      // Should be exactly 4: 2 system + 2 last non-system
      expect(breakpoints).toBe(4)

      // Verify correct placement: system messages
      expect(result[0].providerOptions).toEqual(EPHEMERAL)
      expect(result[1].providerOptions).toEqual(EPHEMERAL)

      // Middle messages should NOT have cache control
      expect(result[2].providerOptions).toBeUndefined()
      expect(result[3].providerOptions).toBeUndefined()
      expect(result[4].providerOptions).toBeUndefined()
      expect(result[5].providerOptions).toBeUndefined()
      expect(result[6].providerOptions).toBeUndefined()

      // Last 2 non-system messages
      expect(result[7].providerOptions).toEqual(EPHEMERAL)
      expect(result[8].providerOptions).toEqual(EPHEMERAL)
    })

    test("preserves existing providerOptions on messages", () => {
      const messages: ModelMessage[] = [
        {
          role: "system",
          content: "System prompt",
          providerOptions: { someOther: { key: "value" } },
        },
        userMsg("Hello"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "anthropic/claude-sonnet-4.5",
      })

      // Should merge, not replace
      expect(result[0].providerOptions).toEqual({
        someOther: { key: "value" },
        anthropic: { cacheControl: { type: "ephemeral" } },
      })
    })

    test("handles tool messages in conversation", () => {
      const messages: ModelMessage[] = [
        systemMsg("System prompt"),
        userMsg("Read a file"),
        assistantMsg("I'll read that file."),
        toolMsg(),
        userMsg("Thanks, now explain it"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "anthropic/claude-sonnet-4.5",
      })

      // System: cached
      expect(result[0].providerOptions).toEqual(EPHEMERAL)
      // Last 2 non-system: tool result and final user message
      expect(result[3].providerOptions).toEqual(EPHEMERAL)
      expect(result[4].providerOptions).toEqual(EPHEMERAL)
    })

    test("detects Anthropic from LanguageModel-like objects", () => {
      const model = {
        provider: "anthropic",
        modelId: "claude-sonnet-4.5",
        specificationVersion: "v3" as const,
        defaultObjectGenerationMode: "json" as const,
        doGenerate: async () => ({} as any),
        doStream: async () => ({} as any),
      }

      const messages: ModelMessage[] = [userMsg("Hello")]
      const result = addCacheControlToMessages({ messages, model: model as any })
      expect(result[0].providerOptions).toEqual(EPHEMERAL)
    })
  })

  describe("OpenAI models", () => {
    test("passes messages through unchanged", () => {
      const messages: ModelMessage[] = [
        systemMsg("System prompt"),
        userMsg("Hello"),
        assistantMsg("Hi"),
        userMsg("Follow up"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "openai/gpt-4o",
      })

      // Messages should be identical (no providerOptions added)
      for (let i = 0; i < result.length; i++) {
        expect(result[i].providerOptions).toBeUndefined()
      }
    })
  })

  describe("Unknown providers", () => {
    test("passes messages through unchanged", () => {
      const messages: ModelMessage[] = [
        systemMsg("System prompt"),
        userMsg("Hello"),
      ]

      const result = addCacheControlToMessages({
        messages,
        model: "google/gemini-2.0-flash",
      })

      for (const msg of result) {
        expect(msg.providerOptions).toBeUndefined()
      }
    })
  })
})

// ─── getCacheProviderOptions ─────────────────────────────────────────

describe("getCacheProviderOptions", () => {
  test("returns promptCacheKey for OpenAI models", () => {
    const result = getCacheProviderOptions({
      model: "openai/gpt-4o",
      postId: "abc123",
    })

    expect(result).toEqual({
      openai: {
        promptCacheKey: "forums-abc123",
      },
    })
  })

  test("returns undefined for OpenAI without postId", () => {
    const result = getCacheProviderOptions({
      model: "openai/gpt-4o",
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined for Anthropic models", () => {
    const result = getCacheProviderOptions({
      model: "anthropic/claude-sonnet-4.5",
      postId: "abc123",
    })
    expect(result).toBeUndefined()
  })

  test("returns undefined for unknown providers", () => {
    const result = getCacheProviderOptions({
      model: "google/gemini-2.0-flash",
      postId: "abc123",
    })
    expect(result).toBeUndefined()
  })

  test("detects GPT model strings", () => {
    for (const model of ["openai/gpt-4o", "openai/gpt-4o-mini"]) {
      const result = getCacheProviderOptions({ model, postId: "test" })
      expect(result).toBeDefined()
      expect(result?.openai?.promptCacheKey).toBe("forums-test")
    }
  })

  test("detects o-series model strings", () => {
    for (const model of ["openai/o1-preview", "openai/o3-mini", "openai/o4-mini"]) {
      const result = getCacheProviderOptions({ model, postId: "test" })
      expect(result).toBeDefined()
    }
  })
})
