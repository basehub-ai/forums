import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { checkIsPro } from "@/lib/autumn"
import { db } from "@/lib/db/client"
import { llmUsers } from "@/lib/db/schema"

export const schema = {}

export const metadata = {
  name: "list_models",
  description: "List available AI models for the ask tool",
  annotations: {
    title: "List available models",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}

export default async function listModels(): Promise<{
  content: { type: "text"; text: string }[]
}> {
  const session = await auth.api.getMcpSession({ headers: await headers() })

  if (!session) {
    throw new Error("Authentication required. Please reconnect with OAuth.")
  }

  const userId = session.userId
  const isPro = await checkIsPro(userId)

  const models = await db
    .select({
      id: llmUsers.id,
      name: llmUsers.name,
      isDefault: llmUsers.isDefault,
      billing_category: llmUsers.billing_category,
    })
    .from(llmUsers)
    .where(
      and(
        eq(llmUsers.isInModelPicker, true),
        isPro ? undefined : eq(llmUsers.billing_category, "standard")
      )
    )

  const text = models
    .map(
      (m) =>
        `- ${m.name} (id: ${m.id})${m.isDefault ? " [default]" : ""}${m.billing_category === "pro" ? " [pro]" : ""}`
    )
    .join("\n")

  const header = isPro
    ? "Available models:"
    : "Available models (upgrade to Pro for more options):"

  return {
    content: [{ type: "text", text: `${header}\n${text}` }],
  }
}
