import { AgentProvider } from "./[threadId]/agent-context"
import { Composer } from "./[threadId]/composer"
import { MessagesStream } from "./[threadId]/messages"

export default function RepoPage() {
  return (
    <AgentProvider>
      <div>
        <div className="space-y-4">
          <MessagesStream />
        </div>
        <Composer />
      </div>
    </AgentProvider>
  )
}
