"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"
import { useDialogStore } from "@/lib/stores/dialogs"

export default function BillingButton({ isPro }: { isPro: boolean }) {
  const { openBillingPortal } = useCustomer()
  const setPaywallOpen = useDialogStore((s) => s.setPaywallOpen)

  if (isPro) {
    return (
      <Button
        className="cursor-pointer"
        onClick={async () => {
          await openBillingPortal({
            returnUrl: window.location.href,
          })
        }}
        size="xs"
        type="button"
        variant="tertiary"
      >
        PRO
      </Button>
    )
  }

  return (
    <Button
      className="cursor-pointer"
      onClick={() => setPaywallOpen(true)}
      size="xs"
      type="button"
      variant="tertiary"
    >
      FREE
    </Button>
  )
}
