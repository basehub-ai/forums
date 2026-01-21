"use client"

import { MoreHorizontal } from "lucide-react"
import { useState, useTransition } from "react"
import { Button } from "@/components/button"
import { Dialog } from "@/components/ui/dialog"
import { Menu } from "@/components/ui/menu"
import {
  createLlmUser,
  deleteLlmUser,
  setBillingCategory,
  setDefaultLlmUser,
  toggleModelPicker,
  updateLlmUser,
} from "@/lib/actions/admin"
import { CopyIdButton } from "./copy-id-button"

type LlmUser = {
  id: string
  name: string
  model: string
  provider: string
  image: string | null
  isDefault: boolean
  isInModelPicker: boolean
  billing_category: string | null
}

type Props = { users: LlmUser[] }

export function LlmUsersTable({ users }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<LlmUser | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [model, setModel] = useState("")
  const [provider, setProvider] = useState("")
  const [image, setImage] = useState("")

  function openAddDialog() {
    setEditingUser(null)
    setName("")
    setModel("")
    setProvider("")
    setImage("")
    setDialogOpen(true)
  }

  function openEditDialog(user: LlmUser) {
    setEditingUser(user)
    setName(user.name)
    setModel(user.model)
    setProvider(user.provider)
    setImage(user.image || "")
    setDialogOpen(true)
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingUser) {
        await updateLlmUser(editingUser.id, {
          name,
          model,
          provider,
          image: image || undefined,
        })
      } else {
        await createLlmUser({
          name,
          model,
          provider,
          image: image || undefined,
        })
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(userId: string) {
    startTransition(async () => {
      await deleteLlmUser(userId)
    })
  }

  return (
    <>
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
          <span className="w-8" />
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
                  user.billing_category === "pro" ? "standard" : "pro"
                )}
              >
                <button
                  className={`text-xs hover:underline ${
                    user.billing_category === "pro"
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
                action={toggleModelPicker.bind(
                  null,
                  user.id,
                  !user.isInModelPicker
                )}
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
            <span className="w-8">
              <Menu.Root>
                <Menu.Trigger className="p-1">
                  <MoreHorizontal className="size-4" />
                </Menu.Trigger>
                <Menu.Popup align="end">
                  <Menu.Item onClick={() => openEditDialog(user)}>
                    Edit
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    className="text-red-400 data-highlighted:text-red-400"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            </span>
          </div>
        ))}
      </div>

      <Button onClick={openAddDialog} size="sm">
        Add LLM User
      </Button>

      <Dialog.Root onOpenChange={setDialogOpen} open={dialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup title={editingUser ? "Edit Model" : "Add Model"}>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
            >
              <div className="space-y-3">
                <input
                  className="w-full bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  required
                  value={name}
                />
                <input
                  className="w-full bg-transparent px-2 py-1 font-mono text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Model (e.g., anthropic/claude-sonnet-4.5)"
                  required
                  value={model}
                />
                <input
                  className="w-full bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="Provider"
                  required
                  value={provider}
                />
                <input
                  className="w-full bg-transparent px-2 py-1 text-sm ring-1 ring-muted ring-inset placeholder:text-muted focus:outline-none focus:ring-dim"
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="Image URL"
                  value={image}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  disabled={isPending}
                  onClick={() => setDialogOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isPending} type="submit">
                  {isPending
                    ? editingUser
                      ? "Saving..."
                      : "Adding..."
                    : editingUser
                      ? "Save"
                      : "Add"}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
