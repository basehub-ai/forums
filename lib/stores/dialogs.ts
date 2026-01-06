import { create } from "zustand"

type DialogStore = {
  paywallOpen: boolean
  setPaywallOpen: (open: boolean) => void
}

export const useDialogStore = create<DialogStore>((set) => ({
  paywallOpen: false,
  setPaywallOpen: (open) => set({ paywallOpen: open }),
}))
