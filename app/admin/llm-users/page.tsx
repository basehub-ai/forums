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
      <h2 className="font-semibold text-xl">LLM Users</h2>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Model</th>
              <th className="px-4 py-2 text-left">Provider</th>
              <th className="px-4 py-2 text-left">Default</th>
              <th className="px-4 py-2 text-left">In Picker</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t" key={user.id}>
                <td className="px-4 py-2 font-mono text-xs">{user.id}</td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{user.model}</td>
                <td className="px-4 py-2">{user.provider}</td>
                <td className="px-4 py-2">
                  {user.isDefault ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <form action={setDefaultLlmUser.bind(null, user.id)}>
                      <button
                        className="text-blue-600 hover:underline"
                        type="submit"
                      >
                        Set default
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-2">
                  {user.isInModelPicker ? "✓" : "—"}
                </td>
                <td className="px-4 py-2">
                  <form action={deleteLlmUser.bind(null, user.id)}>
                    <button
                      className="text-red-600 hover:underline"
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

      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Add LLM User</h3>
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
          className="grid grid-cols-2 gap-4"
        >
          <input
            className="rounded border px-3 py-2"
            name="name"
            placeholder="Display name"
            required
          />
          <input
            className="rounded border px-3 py-2"
            name="model"
            placeholder="Model (e.g., anthropic/claude-sonnet-4.5)"
            required
          />
          <input
            className="rounded border px-3 py-2"
            name="provider"
            placeholder="Provider (anthropic, openai, google, xai)"
            required
          />
          <input
            className="rounded border px-3 py-2"
            name="image"
            placeholder="Image URL (optional)"
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            type="submit"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
