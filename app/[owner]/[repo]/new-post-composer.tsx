"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Composer, type ComposerProps } from "@/components/composer"
import { PostSearchResults } from "@/components/post-search-results"
import { createPost } from "@/lib/actions/posts"
import { usePostSearch } from "@/lib/hooks/use-post-search"

const PREFERRED_LLM_KEY = "preferred-llm"

export function NewPostComposer({
  owner,
  repo,
  askingOptions,
  categoryId,
}: {
  owner: string
  repo: string
  askingOptions: ComposerProps["options"]["asking"]
  categoryId?: string
}) {
  const router = useRouter()
  const [defaultLlmId, setDefaultLlmId] = useState<string | undefined>()
  const { query, setQuery, results, isSearching, hasQuery } = usePostSearch({
    owner,
    repo,
    categoryId,
  })

  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_LLM_KEY)
    if (saved && askingOptions.some((a) => a.id === saved)) {
      setDefaultLlmId(saved)
    }
  }, [askingOptions])

  return (
    <div>
      <Composer
        autoFocus
        defaultAskingId={defaultLlmId}
        onAskingChange={(asking) => {
          localStorage.setItem(PREFERRED_LLM_KEY, asking.id)
        }}
        onQueryChange={setQuery}
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
      {hasQuery && (
        <PostSearchResults
          isSearching={isSearching}
          owner={owner}
          query={query}
          repo={repo}
          results={results}
        />
      )}
    </div>
  )
}
