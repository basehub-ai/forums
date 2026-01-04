"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import type { GitContextData } from "@/agent/types"
import { getPostMetadata, updatePost } from "@/lib/actions/posts"

type Category = {
  id: string
  title: string
  emoji: string | null
}

type StaleInfo = {
  commitsAhead: number
} | null

type PostMetadata = {
  postId: string
  owner: string
  repo: string
  authorId: string
  title: string | null
  category: Category | null
  categories: Category[]
  gitContext: GitContextData | null
  staleInfo: StaleInfo
  isPolling: boolean
  archivedRefs: string[]
  selectedRef: string | null
  setSelectedRef: (ref: string | null) => void
  updateMetadata: (data: {
    title?: string
    categoryId?: string | null
  }) => Promise<void>
}

const PostMetadataContext = createContext<PostMetadata | null>(null)

export function PostMetadataProvider({
  postId,
  owner,
  repo,
  authorId,
  initialTitle,
  initialCategory,
  initialGitContext,
  staleInfo,
  archivedRefs,
  categories,
  children,
}: {
  postId: string
  owner: string
  repo: string
  authorId: string
  initialTitle: string | null
  initialCategory: Category | null
  initialGitContext: GitContextData | null
  staleInfo: StaleInfo
  archivedRefs: string[]
  categories: Category[]
  children: React.ReactNode
}) {
  const [title, setTitle] = useState(initialTitle)
  const [category, setCategory] = useState<Category | null>(initialCategory)
  const [gitContext, setGitContext] = useState<GitContextData | null>(
    initialGitContext
  )
  const [isPolling, setIsPolling] = useState(
    !(initialTitle && initialCategory && initialGitContext)
  )
  const [selectedRef, setSelectedRef] = useState<string | null>(null)

  const poll = useCallback(async () => {
    const result = await getPostMetadata(postId)
    if (result) {
      setTitle(result.title)
      setCategory(result.category)
      setGitContext(result.gitContext)
      setIsPolling(false)
      return true
    }
    return false
  }, [postId])

  useEffect(() => {
    if (!isPolling) {
      return
    }

    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) {
        return
      }
      const done = await poll()
      if (done) {
        clearInterval(interval)
      }
    }, 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isPolling, poll])

  const updateMetadata = useCallback(
    async (data: { title?: string; categoryId?: string | null }) => {
      await updatePost({ postId, ...data })
      if (data.title !== undefined) {
        setTitle(data.title)
      }
      if (data.categoryId !== undefined) {
        const newCategory = data.categoryId
          ? (categories.find((c) => c.id === data.categoryId) ?? null)
          : null
        setCategory(newCategory)
      }
    },
    [postId, categories]
  )

  return (
    <PostMetadataContext.Provider
      value={{
        postId,
        owner,
        repo,
        authorId,
        title,
        category,
        categories,
        gitContext,
        staleInfo,
        isPolling,
        archivedRefs,
        selectedRef,
        setSelectedRef,
        updateMetadata,
      }}
    >
      {children}
    </PostMetadataContext.Provider>
  )
}

export function usePostMetadata() {
  const context = useContext(PostMetadataContext)
  if (!context) {
    throw new Error("usePostMetadata must be used within PostMetadataProvider")
  }
  return context
}
