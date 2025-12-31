"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { AskingSelector } from "@/components/asking-selector"
import { createComment } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function PostComposer({
  postId,
  askingOptions,
  threadCommentId,
  autoFocus,
  onCancel,
  storageKey,
}: {
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  storageKey?: string
}) {
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const userImage = auth?.user?.image
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState("")
  const [seekingAnswerFrom, setSeekingAnswerFrom] = useState<string | null>(
    null
  )

  useEffect(() => {
    if (!storageKey) {
      return
    }
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      setMessage(saved)
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) {
      return
    }
    if (message) {
      sessionStorage.setItem(storageKey, message)
    } else {
      sessionStorage.removeItem(storageKey)
    }
  }, [storageKey, message])

  const handleBlur = (e: React.FocusEvent) => {
    if (!onCancel) {
      return
    }
    const form = formRef.current
    if (!form) {
      return
    }
    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && form.contains(relatedTarget)) {
      return
    }
    onCancel()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isSignedIn) {
      authClient.signIn.social({ provider: "github", callbackURL: pathname })
      return
    }

    if (!message.trim()) {
      return
    }

    startTransition(async () => {
      await createComment({
        postId,
        content: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: message }],
        },
        threadCommentId,
        seekingAnswerFrom,
      })

      setMessage("")
      if (storageKey) {
        sessionStorage.removeItem(storageKey)
      }
    })
  }

  const label = threadCommentId ? "Write a reply" : "Add a comment"
  const placeholder = "Write your comment here"

  return (
    <form
      className="rounded-lg border bg-card p-4"
      onBlur={handleBlur}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="mb-3 flex items-center gap-2">
        {userImage ? (
          <img
            alt="Your avatar"
            className="size-6 rounded-full"
            src={userImage}
          />
        ) : (
          <div className="size-6 rounded-full bg-muted" />
        )}
        <span className="font-medium text-bright text-sm">{label}</span>
      </div>

      <textarea
        autoFocus={autoFocus}
        className="dashed mb-3 min-h-20 w-full resize-none bg-transparent p-3 text-sm placeholder:text-muted-foreground"
        disabled={isPending}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        value={message}
      />

      <div className="flex items-center justify-between">
        <AskingSelector
          disabled={isPending}
          onChange={setSeekingAnswerFrom}
          options={askingOptions}
          value={seekingAnswerFrom}
        />
        <button
          className="rounded bg-accent px-3 py-1.5 font-medium text-label text-sm disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Posting..." : isSignedIn ? "Post" : "Sign in to post"}
        </button>
      </div>
    </form>
  )
}
