"use client"

import { useRouter } from "next/navigation"
import { Composer, type ComposerProps } from "@/components/composer"
import { createPost } from "@/lib/actions/posts"

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

  return (
    <Composer
      autoFocus
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
