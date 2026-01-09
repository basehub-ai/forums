import { create } from "zustand"

type DeleteCommentDialog = {
  commentId: string
  isRootComment: boolean
  hasLlmResponse: boolean
}

type DialogStore = {
  paywallOpen: boolean
  setPaywallOpen: (open: boolean) => void
  deleteCommentDialog: DeleteCommentDialog | null
  setDeleteCommentDialog: (dialog: DeleteCommentDialog | null) => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  paywallOpen: false,
  setPaywallOpen: (open) => set({ paywallOpen: open }),
  deleteCommentDialog: null,
  setDeleteCommentDialog: (dialog) => set({ deleteCommentDialog: dialog }),
}))
