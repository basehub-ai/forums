import type { UIMessage } from "ai"

export type AgentUIMessage = UIMessage<{ errorCode?: number }>

/**
 * Sanitizes a UIMessage by removing provider-specific fields that cause
 * convertToModelMessages to fail. This is needed because providers like
 * Google add `providerOptions` with fields like `thoughtSignature` that
 * aren't part of the UIMessage schema.
 */
export function sanitizeUIMessage<T extends object>(
  message: UIMessage<T>
): UIMessage<T> {
  return {
    ...message,
    parts: message.parts.map((part) => {
      // Strip providerOptions from all parts - it's added by providers at runtime
      // but isn't part of the UIMessage schema and causes convertToModelMessages to fail
      if ("providerOptions" in part) {
        const { providerOptions: _, ...rest } = part
        return rest as (typeof message.parts)[number]
      }
      return part
    }),
  }
}

/**
 * Sanitizes an array of UIMessages
 */
export function sanitizeUIMessages<T extends object>(
  messages: UIMessage<T>[]
): UIMessage<T>[] {
  return messages.map(sanitizeUIMessage)
}
