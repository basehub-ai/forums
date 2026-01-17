"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Composer, type ComposerProps } from "@/components/composer"
import { createPost } from "@/lib/actions/posts"
import type { categories } from "@/lib/db/schema"
import { RepoPostsSection } from "./repo-posts-section"

const PREFERRED_LLM_KEY = "preferred-llm"

type PostListItem = {
  id: string
  number: number
  title: string | null
  categoryId: string | null
  authorId: string
  authorUsername: string | null
  rootCommentId: string | null
  createdAt: number
  pinned: boolean
  commentCount: number
  reactionCount: number
}

type Category = InferSelectModel<typeof categories>

type RepoContentProps = {
  owner: string
  repo: string
  posts: PostListItem[]
  pinnedPosts: PostListItem[]
  categoriesById: Record<string, Category>
  askingOptions: ComposerProps["options"]["asking"]
  categoryId?: string
  defaultBranch: string
}

export function RepoContent({
  owner,
  repo,
  posts,
  pinnedPosts,
  categoriesById,
  askingOptions,
  categoryId,
  defaultBranch,
}: RepoContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [defaultLlmId, setDefaultLlmId] = useState<string | undefined>()

  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_LLM_KEY)
    if (saved && askingOptions.some((a) => a.id === saved)) {
      setDefaultLlmId(saved)
    }
  }, [askingOptions])

  return (
    <>
      <div className="mb-8">
        <Composer
          autoFocus
          defaultAskingId={defaultLlmId}
          defaultBranch={defaultBranch}
          onAskingChange={(asking) => {
            localStorage.setItem(PREFERRED_LLM_KEY, asking.id)
          }}
          onChange={setSearchQuery}
          onSubmit={async ({ value, options, branch }) => {
            const result = await createPost({
              owner,
              repo,
              content: {
                id: crypto.randomUUID(),
                role: "user",
                parts: [{ type: "text", text: value }],
              },
              seekingAnswerFrom: options.asking.id,
              categoryId,
              branch,
            })
            router.push(`/${owner}/${repo}/${result.postNumber}`)
          }}
          options={{
            asking: askingOptions,
          }}
          owner={owner}
          placeholder="Ask or search"
          repo={repo}
          storageKey={`new-post-composer:${owner}:${repo}`}
        />
      </div>

      <RepoPostsSection
        categoriesById={categoriesById}
        categoryId={categoryId}
        owner={owner}
        pinnedPosts={pinnedPosts}
        posts={posts}
        repo={repo}
        searchQuery={searchQuery}
      />
    </>
  )
}
