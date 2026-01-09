"use client"

import { DeleteCommentDialog } from "@/components/delete-comment-dialog"
import { PaywallDialog } from "@/components/paywall-dialog"

export function Dialogs() {
  return (
    <>
      <PaywallDialog />
      <DeleteCommentDialog />
    </>
  )
}
