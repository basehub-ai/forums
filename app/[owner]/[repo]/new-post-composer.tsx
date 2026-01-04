"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Composer, type ComposerProps } from "@/components/composer"
import { createPost } from "@/lib/actions/posts"

const PREFERRED_LLM_KEY = "preferred-llm"

export function NewPostComposer({
  owner,
  repo,
  askingOptions,
}: {
  owner: string
  repo: string
  askingOptions: ComposerProps["options"]["asking"]
}) {
  const router = useRouter()
  const [defaultLlmId, setDefaultLlmId] = useState<string | undefined>()

  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_LLM_KEY)
    if (saved && askingOptions.some((a) => a.id === saved)) {
      setDefaultLlmId(saved)
    }
  }, [askingOptions])

  return (
    <Composer
      autoFocus
      defaultAskingId={defaultLlmId}
      onAskingChange={(asking) => {
        localStorage.setItem(PREFERRED_LLM_KEY, asking.id)
      }}
      onSubmit={async ({ value, options }) => {
        const result = await createPost({
          owner,
          repo,
          content: {
            id: crypto.randomUUID(),
            role: "user",
            parts: [{ type: "text", text: value }],
          },
          seekingAnswerFrom: options.asking.id,
        })
        router.push(`/${owner}/${repo}/${result.postNumber}`)
      }}
      options={{
        asking: askingOptions,
      }}
      placeholder="Ask or search"
      storageKey={`new-post-composer:${owner}:${repo}`}
    />
  )
}
