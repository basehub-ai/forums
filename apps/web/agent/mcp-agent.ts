import { convertToModelMessages, generateText, stepCountIs } from "ai"
import { autumn } from "@/lib/autumn"
import { getUserAccessToken } from "@/lib/data/github"
import { getTools } from "./tools"
import type { AgentUIMessage } from "./types"
import { getWorkspace } from "./workspace"

const SYSTEM_PROMPT = (owner: string, repo: string) =>
  `You're assisting a user with questions about the GitHub repository \`${owner}/${repo}\`.

## Environment
The repo is already cloned and available. All file paths are relative to the workspace root. You can use Read, Grep, and List tools to explore the codebase.

## General Goals
Users might ask you anything, but generally, your goal should be to ground your knowledge with the source code to provide a sourced answer. Users want to get to the source. As you explore source code, you'll note that sometimes, repositories are documented (say, with comments, or markdown files). While that's certainly useful, nothing beats reading the actual source code, as documentation gets stale overtime.

Be thorough but concise. When you find the answer, provide a clear response with relevant file paths and code snippets where appropriate.`

/**
 * Non-streaming agent for MCP tool use.
 * Runs an agentic loop and returns only the final text response.
 */
export async function mcpAgent({
  owner,
  repo,
  ref,
  messages,
  model,
  userId,
}: {
  owner: string
  repo: string
  ref?: string
  messages: AgentUIMessage[]
  model: string
  userId: string
}): Promise<{ response: string; gitRef: string }> {
  console.log("mcpAgent", { owner, repo, ref, messages, userId })

  const userAccessToken = await getUserAccessToken(userId)

  const workspace = await getWorkspace({
    sandboxId: null,
    gitContext: { owner, repo, ref },
    mode: "ask",
    userAccessToken,
  })

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT(owner, repo),
    messages: await convertToModelMessages(messages),
    tools: getTools({ workspace }),
    stopWhen: stepCountIs(50),
  })

  // Track billing
  await autumn
    .track({
      customer_id: userId,
      feature_id: "standard_credits",
      value: 1,
    })
    .catch((err) => console.error("Failed to track MCP agent billing:", err))

  return {
    response: result.text || "I was unable to generate a response.",
    gitRef: workspace.gitContextData.sha,
  }
}
