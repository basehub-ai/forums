"use client"

import { DeletePostOrCommentDialog } from "@/components/delete-comment-dialog"
import { ModeratorDeletePostDialog } from "@/components/moderator-delete-post-dialog"
import { PaywallDialog } from "@/components/paywall-dialog"

export function Dialogs() {
  return (
    <>
      <PaywallDialog />
      <DeletePostOrCommentDialog />
      <ModeratorDeletePostDialog />
    </>
  )
}
