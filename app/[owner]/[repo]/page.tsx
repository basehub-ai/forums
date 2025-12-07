import { AgentProvider } from "./[threadId]/agent-context"
import { ThreadWithComposer } from "./[threadId]/thread"

export default function RepoPage() {
  return (
    <AgentProvider>
      <ThreadWithComposer initialMessages={[]} />
    </AgentProvider>
  )
}
