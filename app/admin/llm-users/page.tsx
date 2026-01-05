import { Subtitle } from "@/components/typography"
import {
  createLlmUser,
  deleteLlmUser,
  setDefaultLlmUser,
} from "@/lib/actions/admin"
import { db } from "@/lib/db/client"
import { llmUsers } from "@/lib/db/schema"

export default async function LlmUsersPage() {
  const users = await db.select().from(llmUsers).orderBy(llmUsers.createdAt)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-medium text-sm uppercase">LLM Users</h2>
        <Subtitle className="text-dim text-sm">
          Manage AI models that can respond in the forum
        </Subtitle>
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className="border-b text-left text-faint text-xs uppercase">
              <th className="px-4 py-2 font-medium sm:px-2">ID</th>
              <th className="px-4 py-2 font-medium sm:px-2">Name</th>
              <th className="px-4 py-2 font-medium sm:px-2">Model</th>
              <th className="px-4 py-2 font-medium sm:px-2">Provider</th>
              <th className="px-4 py-2 font-medium sm:px-2">Default</th>
              <th className="px-4 py-2 font-medium sm:px-2">In Picker</th>
              <th className="px-4 py-2 font-medium sm:px-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-dim">
            {users.map((user) => (
              <tr
                className="border-b border-dashed last:border-0"
                key={user.id}
              >
                <td className="px-4 py-2 font-mono text-faint text-xs sm:px-2">
                  {user.id}
                </td>
                <td className="px-4 py-2 text-bright sm:px-2">{user.name}</td>
                <td className="px-4 py-2 font-mono text-xs sm:px-2">
                  {user.model}
                </td>
                <td className="px-4 py-2 sm:px-2">{user.provider}</td>
                <td className="px-4 py-2 sm:px-2">
                  {user.isDefault ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <form action={setDefaultLlmUser.bind(null, user.id)}>
                      <button
                        className="text-dim hover:text-bright hover:underline"
                        type="submit"
                      >
                        Set default
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-2 sm:px-2">
                  {user.isInModelPicker ? "✓" : "—"}
                </td>
                <td className="px-4 py-2 sm:px-2">
                  <form action={deleteLlmUser.bind(null, user.id)}>
                    <button
                      className="text-red-500 hover:text-red-400 hover:underline"
                      type="submit"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-4 font-medium text-sm uppercase">Add LLM User</h3>
        <form
          action={async (formData: FormData) => {
            "use server"
            await createLlmUser({
              name: formData.get("name") as string,
              model: formData.get("model") as string,
              provider: formData.get("provider") as string,
              image: (formData.get("image") as string) || undefined,
            })
          }}
          className="grid grid-cols-2 gap-3"
        >
          <input
            className="rounded border border-muted bg-background px-3 py-2 text-sm placeholder:text-faint focus:border-dim focus:outline-none"
            name="name"
            placeholder="Display name"
            required
          />
          <input
            className="rounded border border-muted bg-background px-3 py-2 text-sm placeholder:text-faint focus:border-dim focus:outline-none"
            name="model"
            placeholder="Model (e.g., anthropic/claude-sonnet-4.5)"
            required
          />
          <input
            className="rounded border border-muted bg-background px-3 py-2 text-sm placeholder:text-faint focus:border-dim focus:outline-none"
            name="provider"
            placeholder="Provider (anthropic, openai, google, xai)"
            required
          />
          <input
            className="rounded border border-muted bg-background px-3 py-2 text-sm placeholder:text-faint focus:border-dim focus:outline-none"
            name="image"
            placeholder="Image URL (optional)"
          />
          <button
            className="rounded bg-bright px-4 py-2 text-background text-sm hover:opacity-90"
            type="submit"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
