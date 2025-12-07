import { AgentProvider } from "./[threadId]/agent-context"
import { Composer } from "./[threadId]/composer"

export default function RepoPage() {
  return (
    <AgentProvider>
      <div>
        <Composer />
      </div>
    </AgentProvider>
  )
}
