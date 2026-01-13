"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type Heading = {
  id: string
  text: string
  level: number
}

type TocContextValue = {
  activeCommentId: string | null
  setActiveCommentId: (id: string | null) => void
  activeHeadingId: string | null
  setActiveHeadingId: (id: string | null) => void
  headings: Heading[]
  registerHeading: (heading: Heading) => void
  unregisterHeading: (id: string) => void
  clearHeadings: () => void
}

const TocContext = createContext<TocContextValue | null>(null)

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])

  const registerHeading = useCallback((heading: Heading) => {
    setHeadings((prev) => {
      if (prev.some((h) => h.id === heading.id)) {
        return prev
      }
      return [...prev, heading]
    })
  }, [])

  const unregisterHeading = useCallback((id: string) => {
    setHeadings((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const clearHeadings = useCallback(() => {
    setHeadings([])
  }, [])

  const value = useMemo(
    () => ({
      activeCommentId,
      setActiveCommentId,
      activeHeadingId,
      setActiveHeadingId,
      headings,
      registerHeading,
      unregisterHeading,
      clearHeadings,
    }),
    [
      activeCommentId,
      activeHeadingId,
      headings,
      registerHeading,
      unregisterHeading,
      clearHeadings,
    ]
  )

  return <TocContext.Provider value={value}>{children}</TocContext.Provider>
}

const noopToc: TocContextValue = {
  activeCommentId: null,
  setActiveCommentId: () => {},
  activeHeadingId: null,
  setActiveHeadingId: () => {},
  headings: [],
  registerHeading: () => {},
  unregisterHeading: () => {},
  clearHeadings: () => {},
}

export function useToc() {
  const context = useContext(TocContext)
  return context ?? noopToc
}

export function useActiveCommentObserver(commentIds: string[]) {
  const { setActiveCommentId } = useToc()

  useEffect(() => {
    if (commentIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top
              ? prev
              : curr
          )
          setActiveCommentId(topEntry.target.id)
        }
      },
      {
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    )

    for (const id of commentIds) {
      const el = document.getElementById(id)
      if (el) {
        observer.observe(el)
      }
    }

    return () => observer.disconnect()
  }, [commentIds, setActiveCommentId])
}

export function useActiveHeadingObserver(commentNumber: string | null) {
  const { setActiveHeadingId } = useToc()

  useEffect(() => {
    if (!commentNumber) {
      setActiveHeadingId(null)
      return
    }

    const headingElements = document.querySelectorAll(
      `[data-heading-comment="${commentNumber}"]`
    )

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) =>
            prev.boundingClientRect.top < curr.boundingClientRect.top
              ? prev
              : curr
          )
          setActiveHeadingId(topEntry.target.id)
        }
      },
      {
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    )

    headingElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [commentNumber, setActiveHeadingId])
}
