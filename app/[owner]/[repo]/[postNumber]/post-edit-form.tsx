"use client"

import { Menu } from "@base-ui/react/menu"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { usePostMetadata } from "./post-metadata-context"

export function PostEditForm({ onClose }: { onClose: () => void }) {
  const { title, category, categories, updateMetadata } = usePostMetadata()
  const [newTitle, setNewTitle] = useState(title ?? "")
  const [newCategoryId, setNewCategoryId] = useState<string | null>(
    category?.id ?? null
  )
  const [isPending, startTransition] = useTransition()

  const selectedCategory = newCategoryId
    ? categories.find((c) => c.id === newCategoryId)
    : null

  const hasChanges =
    newTitle !== title || newCategoryId !== (category?.id ?? null)

  const handleSave = () => {
    if (!hasChanges) {
      onClose()
      return
    }

    startTransition(async () => {
      const updates: { title?: string; categoryId?: string | null } = {}
      if (newTitle !== title) {
        updates.title = newTitle
      }
      if (newCategoryId !== (category?.id ?? null)) {
        updates.categoryId = newCategoryId
      }
      await updateMetadata(updates)
      onClose()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        className="w-full border border-border-solid bg-transparent px-2 py-1.5 font-medium text-bright text-xl outline-none focus:border-accent"
        disabled={isPending}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSave()
          }
          if (e.key === "Escape") {
            onClose()
          }
        }}
        placeholder="Post title"
        type="text"
        value={newTitle}
      />

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">Category:</span>
        <Menu.Root>
          <Menu.Trigger
            className="flex items-center gap-1.5 text-sm hover:text-bright"
            disabled={isPending}
          >
            {selectedCategory ? (
              <>
                {selectedCategory.emoji && (
                  <span>{selectedCategory.emoji}</span>
                )}
                <span>{selectedCategory.title}</span>
              </>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
            <ChevronDownIcon className="h-3 w-3 opacity-50" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner align="start">
              <Menu.Popup>
                <Menu.Item onClick={() => setNewCategoryId(null)}>
                  <span className="text-muted-foreground">None</span>
                </Menu.Item>
                {categories.map((cat) => (
                  <Menu.Item
                    key={cat.id}
                    onClick={() => setNewCategoryId(cat.id)}
                  >
                    {cat.emoji && <span>{cat.emoji}</span>}
                    {cat.title}
                    {cat.id === newCategoryId && (
                      <CheckIcon className="ml-auto h-3 w-3" />
                    )}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1 bg-accent px-2 py-1 text-sm text-white disabled:opacity-50"
          disabled={isPending || !newTitle.trim()}
          onClick={handleSave}
          type="button"
        >
          <CheckIcon className="h-3 w-3" />
          Save
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 text-muted-foreground text-sm hover:text-bright"
          disabled={isPending}
          onClick={onClose}
          type="button"
        >
          <XIcon className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  )
}
