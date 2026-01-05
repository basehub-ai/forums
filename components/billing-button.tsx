"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"
import { getSiteOrigin } from "@/lib/utils"

export default function BillingButton() {
  const { checkout, openBillingPortal, check } = useCustomer()

  const isPro = check({ productId: "pro_plan" }).data.allowed

  return (
    <Button
      className="cursor-pointer"
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
          successUrl: getSiteOrigin(),
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
