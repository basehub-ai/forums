"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"

export default function BillingButton() {
  const { checkout } = useCustomer()

  return (
    <Button
      onClick={async () => {
        await checkout({
          productId: "pro_plan",
          options: [
            {
              featureId: "premium_credits",
              quantity: 0,
            },
            {
              featureId: "boosts",
              quantity: 0,
            },
          ],
        })
      }}
      type="button"
      variant="secondary"
    >
      Go Pro
    </Button>
  )
}
