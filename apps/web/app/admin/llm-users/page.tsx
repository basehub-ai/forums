import { db } from "@/lib/db/client"
import { llmUsers } from "@/lib/db/schema"
import { LlmUsersTable } from "./llm-users-table"

export default async function LlmUsersPage() {
  const users = await db.select().from(llmUsers).orderBy(llmUsers.createdAt)

  return (
    <div className="space-y-8">
      <h2 className="font-bold text-bright text-lg underline">LLM Users</h2>
      <LlmUsersTable users={users} />
    </div>
  )
}
