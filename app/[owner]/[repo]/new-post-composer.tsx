"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { AskingSelector } from "@/components/asking-selector"
import { Button } from "@/components/button"
import { createPost } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function NewPostComposer({
  owner,
  repo,
  askingOptions,
}: {
  owner: string
  repo: string
  askingOptions: AskingOption[]
}) {
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [seekingAnswerFrom, setSeekingAnswerFrom] = useState<string | null>(
    null
  )
  const [message, setMessage] = useState("")
  const storageKey = `new-post-composer:${owner}:${repo}`

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      setMessage(saved)
    }
  }, [storageKey])

  useEffect(() => {
    if (message) {
      sessionStorage.setItem(storageKey, message)
    } else {
      sessionStorage.removeItem(storageKey)
    }
  }, [storageKey, message])

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
      const result = await createPost({
        owner,
        repo,
        content: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: message }],
        },
        seekingAnswerFrom,
      })

      setMessage("")
      sessionStorage.removeItem(storageKey)
      router.push(`/${owner}/${repo}/${result.postNumber}`)
      router.refresh()
    })
  }

  return (
    <form
      className="relative border-2 border-dashed bg-muted/30 p-4"
      onSubmit={handleSubmit}
    >
      <textarea
        className="min-h-24 w-full resize-none bg-transparent"
        disabled={isPending}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask or search"
        value={message}
      />
      <div className="flex items-center justify-between">
        <AskingSelector
          disabled={isPending}
          onChange={setSeekingAnswerFrom}
          options={askingOptions}
          value={seekingAnswerFrom}
        />
        <Button disabled={isPending} type="submit">
          {isPending ? "Posting..." : isSignedIn ? "Post" : "Log In"}
        </Button>
      </div>
    </form>
  )
}
