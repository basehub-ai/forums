"use client"

import { ArrowUpIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { AskingSelector } from "@/components/asking-selector"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  connected,
}: {
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  connected?: boolean
}) {
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [seekingAnswerFrom, setSeekingAnswerFrom] = useState<string | null>(
    null
  )

  const handleBlur = (e: React.FocusEvent) => {
    if (!onCancel) return
    const form = formRef.current
    if (!form) return
    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && form.contains(relatedTarget)) return
    onCancel()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isSignedIn) {
      authClient.signIn.social({ provider: "github", callbackURL: pathname })
      return
    }

    const formData = new FormData(e.currentTarget)
    const message = formData.get("message")?.toString() || ""

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

      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <form
      className={
        connected
          ? "-mt-px rounded-b-lg border border-t-0 bg-card p-4"
          : "rounded-lg border bg-card p-4"
      }
      onBlur={handleBlur}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <Textarea
        autoFocus={autoFocus}
        className="mb-3 min-h-[100px] resize-none"
        disabled={isPending}
        name="message"
        placeholder={threadCommentId ? "Write a reply..." : "Add a comment..."}
      />
      <div className="flex items-center justify-between">
        <AskingSelector
          disabled={isPending}
          onChange={setSeekingAnswerFrom}
          options={askingOptions}
          value={seekingAnswerFrom}
        />
        <Button disabled={isPending} size="sm" type="submit">
          <ArrowUpIcon className="mr-1 h-4 w-4" />
          {isPending ? "Sending..." : isSignedIn ? "Send" : "Sign in to send"}
        </Button>
      </div>
    </form>
  )
}
