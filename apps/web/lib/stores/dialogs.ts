import { create } from "zustand"

type DeletePostOrCommentDialog = {
  commentId: string
  isRootComment: boolean
  hasLlmResponse: boolean
}

type ModeratorDeletePostDialog = {
  postId: string
}

type DialogStore = {
  paywallOpen: boolean
  setPaywallOpen: (open: boolean) => void
  deletePostOrCommentDialog: DeletePostOrCommentDialog | null
  setDeletePostOrCommentDialog: (
    dialog: DeletePostOrCommentDialog | null
  ) => void
  moderatorDeletePostDialog: ModeratorDeletePostDialog | null
  setModeratorDeletePostDialog: (
    dialog: ModeratorDeletePostDialog | null
  ) => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  paywallOpen: false,
  setPaywallOpen: (open) => set({ paywallOpen: open }),
  deletePostOrCommentDialog: null,
  setDeletePostOrCommentDialog: (dialog) =>
    set({ deletePostOrCommentDialog: dialog }),
  moderatorDeletePostDialog: null,
  setModeratorDeletePostDialog: (dialog) =>
    set({ moderatorDeletePostDialog: dialog }),
}))
