"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { Button } from "@/components/button"
import { Dialog } from "@/components/ui/dialog"
import { deleteComment } from "@/lib/actions/posts"
import { useDialogStore } from "@/lib/stores/dialogs"

export function DeletePostOrCommentDialog() {
  const dialog = useDialogStore((s) => s.deletePostOrCommentDialog)
  const setDialog = useDialogStore((s) => s.setDeletePostOrCommentDialog)
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
        const result = await deleteComment(dialog.commentId)
        setDialog(null)
        setError(null)
        if (result.deletedPost) {
          const path = window.location.pathname
          const parts = path.split("/").filter(Boolean)
          if (parts.length >= 2) {
            router.push(`/${parts[0]}/${parts[1]}`)
          }
        }
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete")
      }
    })
  }

  const title = dialog?.isRootComment ? "Delete Post" : "Delete Comment"

  const message = dialog?.isRootComment
    ? "This will permanently delete the entire post, including all its comments."
    : dialog?.hasLlmResponse
      ? "This will also delete the LLM's response to this comment."
      : "This will permanently delete this comment."

  return (
    <Dialog.Root onOpenChange={() => handleClose()} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup initialFocus={deleteButtonRef} title={title}>
          <div className="space-y-4">
            <p className="text-muted text-sm">{message}</p>
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
