"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Composer, type ComposerProps } from "@/components/composer"
import { createPost } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"
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
  visibility: "private" | null
  commentCount: number
  reactionCount: number
}

type Category = InferSelectModel<typeof categories>

type RepoContentProps = {
  owner: string
  repo: string
  posts: PostListItem[]
  categoriesById: Record<string, Category>
  askingOptions: ComposerProps["options"]["asking"]
  categoryId?: string
}

export function RepoContent({
  owner,
  repo,
  posts,
  categoriesById,
  askingOptions,
  categoryId,
}: RepoContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [defaultLlmId, setDefaultLlmId] = useState<string | undefined>()
  const { data: auth } = authClient.useSession()
  const userId = auth?.user?.id

  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_LLM_KEY)
    if (saved && askingOptions.some((a) => a.id === saved)) {
      setDefaultLlmId(saved)
    }
  }, [askingOptions])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (post.visibility !== "private") return true
      return userId && post.authorId === userId
    })
  }, [posts, userId])

  return (
    <>
      <div className="mb-8">
        <Composer
          autoFocus
          defaultAskingId={defaultLlmId}
          onAskingChange={(asking) => {
            localStorage.setItem(PREFERRED_LLM_KEY, asking.id)
          }}
          onChange={setSearchQuery}
          onSubmit={async ({ value, visibility, options }) => {
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
              visibility: visibility === "private" ? "private" : null,
            })
            router.push(`/${owner}/${repo}/${result.postNumber}`)
          }}
          options={{
            asking: askingOptions,
          }}
          placeholder="Ask or search"
          showVisibility
          storageKey={`new-post-composer:${owner}:${repo}`}
        />
      </div>

      <RepoPostsSection
        categoriesById={categoriesById}
        categoryId={categoryId}
        owner={owner}
        posts={filteredPosts}
        repo={repo}
        searchQuery={searchQuery}
      />
    </>
  )
}
