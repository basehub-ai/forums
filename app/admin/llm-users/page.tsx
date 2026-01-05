import { Button } from "@/components/button"
import {
  createLlmUser,
  deleteLlmUser,
  setBillingCategory,
  setDefaultLlmUser,
  updateLlmUser,
} from "@/lib/actions/admin"
import { db } from "@/lib/db/client"
import { llmUsers } from "@/lib/db/schema"
import { CopyIdButton } from "./copy-id-button"

export default async function LlmUsersPage() {
  const users = await db.select().from(llmUsers).orderBy(llmUsers.createdAt)

  return (
    <div className="space-y-8">
      <h2 className="font-bold text-bright text-lg underline">LLM Users</h2>

      <div className="space-y-2">
        <div className="flex gap-4 text-muted text-sm uppercase">
          <span className="w-6" />
          <span className="w-8">Img</span>
          <span className="w-32">Name</span>
          <span className="flex-1">Model</span>
          <span className="w-24">Provider</span>
          <span className="w-24">Category</span>
          <span className="w-20">Default</span>
          <span className="w-20">Picker</span>
          <span className="w-16" />
        </div>
        <hr className="divider-md border-0" />
        {users.map((user) => (
          <div className="flex items-center gap-4 py-1 text-sm" key={user.id}>
            <span className="w-6">
              <CopyIdButton id={user.id} />
            </span>
            <span className="w-8">
              {user.image ? (
                <img
                  alt={user.name}
                  className="size-6 rounded-full object-cover"
                  src={user.image}
                />
              ) : (
                <span className="text-dim">—</span>
              )}
            </span>
            <span className="w-32 truncate text-bright">{user.name}</span>
            <span className="flex-1 truncate font-mono text-dim text-xs">
              {user.model}
            </span>
            <span className="w-24 text-dim">{user.provider}</span>
            <span className="w-24">
              <form
                action={setBillingCategory.bind(
                  null,
                  user.id,
                  user.billing_category === "premium" ? "standard" : "premium"
                )}
              >
                <button
                  className={`text-xs hover:underline ${
                    user.billing_category === "premium"
                      ? "text-purple-400"
                      : "text-dim"
                  }`}
                  type="submit"
                >
                  {user.billing_category || "standard"}
                </button>
              </form>
            </span>
            <span className="w-20">
              {user.isDefault ? (
                <span className="text-green-500">✓</span>
              ) : (
                <form action={setDefaultLlmUser.bind(null, user.id)}>
                  <button className="text-dim hover:underline" type="submit">
                    set
                  </button>
                </form>
              )}
            </span>
            <span className="w-20">
              <form
                action={async () => {
                  "use server"
                  await updateLlmUser(user.id, {
                    isInModelPicker: !user.isInModelPicker,
                  })
                }}
              >
                <button
                  className={`text-xs hover:underline ${
                    user.isInModelPicker ? "text-green-500" : "text-dim"
                  }`}
                  type="submit"
                >
                  {user.isInModelPicker ? "yes" : "no"}
                </button>
              </form>
            </span>
            <span className="w-16">
              <form action={deleteLlmUser.bind(null, user.id)}>
                <button className="text-red-400 hover:underline" type="submit">
                  delete
                </button>
              </form>
            </span>
          </div>
        ))}
      </div>

      <hr className="divider-md border-0" />

      <div className="flex flex-col gap-4">
        <div>
          <h3 className="mb-4 font-medium text-bright">Update Name</h3>
          <form
            action={async (formData: FormData) => {
              "use server"
              const userId = formData.get("userId") as string
              const name = formData.get("name") as string
              await updateLlmUser(userId, { name })
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset focus:outline-none focus:ring-dim"
              name="userId"
              required
            >
              <option value="">Select user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <input
              className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
              name="name"
              placeholder="New name"
              required
            />
            <Button size="sm" type="submit">
              Update
            </Button>
          </form>
        </div>

        <div>
          <h3 className="mb-4 font-medium text-bright">Update Image</h3>
          <form
            action={async (formData: FormData) => {
              "use server"
              const userId = formData.get("userId") as string
              const image = formData.get("image") as string
              await updateLlmUser(userId, { image: image || undefined })
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <select
              className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset focus:outline-none focus:ring-dim"
              name="userId"
              required
            >
              <option value="">Select user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <input
              className="flex-1 bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
              name="image"
              placeholder="Image URL (leave empty to clear)"
            />
            <Button size="sm" type="submit">
              Update
            </Button>
          </form>
        </div>
      </div>

      <hr className="divider-md border-0" />

      <div>
        <h3 className="mb-4 font-medium text-bright">Add LLM User</h3>
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
          className="flex flex-wrap gap-2"
        >
          <input
            className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
            name="name"
            placeholder="Name"
            required
          />
          <input
            className="flex-1 bg-transparent px-2 py-1 font-mono text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
            name="model"
            placeholder="Model (e.g., anthropic/claude-sonnet-4.5)"
            required
          />
          <input
            className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
            name="provider"
            placeholder="Provider"
            required
          />
          <input
            className="bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
            name="image"
            placeholder="Image URL"
          />
          <Button size="sm" type="submit">
            Add
          </Button>
        </form>
      </div>
    </div>
  )
}
