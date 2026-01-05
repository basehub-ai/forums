"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"

export default function BillingButton() {
  const { checkout, openBillingPortal, check } = useCustomer()

  const isPro = check({ productId: "pro_plan" }).data.allowed

  return (
    <Button
      className=""
      onClick={async () => {
        if (isPro) {
          await openBillingPortal()
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
