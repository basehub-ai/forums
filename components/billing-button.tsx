"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"

export default function BillingButton() {
  const { checkout, customer, openBillingPortal, check } = useCustomer()

  const isPro = check({ productId: "pro_plan" })

  // console.log(customer)

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
      {customer?.products?.[0]?.id === "free_plan" ? "FREE" : "PRO"}
    </Button>
  )
}
