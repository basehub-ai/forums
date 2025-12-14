"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { getPostMetadata } from "@/lib/actions/posts"

type Category = {
  id: string
  title: string
  emoji: string | null
}

type PostMetadata = {
  title: string | null
  category: Category | null
  isPolling: boolean
}

const PostMetadataContext = createContext<PostMetadata | null>(null)

export function PostMetadataProvider({
  postId,
  initialTitle,
  initialCategory,
  children,
}: {
  postId: string
  initialTitle: string | null
  initialCategory: Category | null
  children: React.ReactNode
}) {
  const [title, setTitle] = useState(initialTitle)
  const [category, setCategory] = useState<Category | null>(initialCategory)
  const [isPolling, setIsPolling] = useState(!(initialTitle && initialCategory))

  const poll = useCallback(async () => {
    const result = await getPostMetadata(postId)
    if (result) {
      setTitle(result.title)
      setCategory(result.category)
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

  return (
    <PostMetadataContext.Provider value={{ title, category, isPolling }}>
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
