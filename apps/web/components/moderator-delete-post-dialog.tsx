"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/button"
import { Dialog } from "@/components/ui/dialog"
import { deletePost } from "@/lib/actions/moderation"
import { useDialogStore } from "@/lib/stores/dialogs"

export function ModeratorDeletePostDialog() {
  const dialog = useDialogStore((s) => s.moderatorDeletePostDialog)
  const setDialog = useDialogStore((s) => s.setModeratorDeletePostDialog)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const isOpen = dialog !== null

  function handleClose() {
    if (!isPending) {
      setDialog(null)
      setError(null)
    }
  }

  function handleDelete() {
    if (!dialog) {
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const { owner, repo } = await deletePost(dialog.postId)
        setDialog(null)
        setError(null)
        router.push(`/${owner}/${repo}`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete")
      }
    })
  }

  return (
    <Dialog.Root onOpenChange={() => handleClose()} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup initialFocus={deleteButtonRef} title="Delete Post">
          <div className="space-y-4">
            <p className="text-muted text-sm">
              This will permanently delete the entire post, including all its
              comments.
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                disabled={isPending}
                onClick={handleClose}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={handleDelete}
                ref={deleteButtonRef}
                type="button"
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
