import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import type { AgentUIMessage } from "@/agent/types"
import { Composer } from "./composer"
import { MessagesStatic, MessagesStream } from "./messages"

export const ThreadWithComposer = ({
  initialMessages,
  title,
  owner,
  repo,
}: {
  initialMessages: AgentUIMessage[]
  title?: string
  owner?: string
  repo?: string
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl py-8">
        {!!owner && !!repo && (
          <div className="mb-6">
            <Link
              className="flex items-center gap-1 text-muted-foreground text-sm hover:underline"
              href={`/${owner}/${repo}`}
            >
              <ArrowLeftIcon size={14} /> Back to {owner}/{repo}
            </Link>
            {!!title && <h1 className="font-medium text-3xl">{title}</h1>}
          </div>
        )}
        <div className="space-y-4">
          <MessagesStatic messages={initialMessages} />
          <MessagesStream />
        </div>
        <div className="sticky bottom-4">
          <Composer />
        </div>
      </div>
    </div>
  )
}
