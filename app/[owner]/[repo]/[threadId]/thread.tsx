import type { AgentUIMessage } from "@/agent/types"
import { Composer } from "./composer"
import { MessagesStatic, MessagesStream } from "./messages"

export const ThreadWithComposer = ({
  initialMessages,
}: {
  initialMessages: AgentUIMessage[]
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl py-8">
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
