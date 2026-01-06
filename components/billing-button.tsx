"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"

export default function BillingButton({ isPro }: { isPro: boolean }) {
  const { checkout, openBillingPortal } = useCustomer()

  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        if (isPro) {
          await openBillingPortal({
            returnUrl: window.location.href,
          })
          return
        }

        await checkout({
          productId: "pro_plan",
          options: [
            {
              featureId: "premium_credits",
              quantity: 0,
            },
          ],
          successUrl: window.location.href,
          checkoutSessionParams: {
            cancel_url: window.location.href,
          },
        })
      }}
      size="xs"
      type="button"
      variant="tertiary"
    >
      {isPro ? "PRO" : "FREE"}
    </Button>
  )
}
