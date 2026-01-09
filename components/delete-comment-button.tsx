"use client"

import { Trash2 } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { authClient } from "@/lib/auth-client"
import { useDialogStore } from "@/lib/stores/dialogs"

export function DeleteCommentButton({
  commentId,
  authorId,
  isRootComment,
  hasLlmResponse,
}: {
  commentId: string
  authorId: string
  isRootComment: boolean
  hasLlmResponse: boolean
}) {
  const session = authClient.useSession()
  const userId = session.data?.user.id
  const setDialog = useDialogStore((s) => s.setDeleteCommentDialog)

  const isAuthor = userId === authorId

  if (!isAuthor) {
    return null
  }

  function handleClick() {
    setDialog({
      commentId,
      isRootComment,
      hasLlmResponse,
    })
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className="flex size-6 cursor-pointer items-center justify-center pr-0.5 text-muted-foreground text-xs"
        onClick={handleClick}
      >
        <Trash2 absoluteStrokeWidth className="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Popup>
        {isRootComment ? "Delete post" : "Delete comment"}
      </Tooltip.Popup>
    </Tooltip.Root>
  )
}
