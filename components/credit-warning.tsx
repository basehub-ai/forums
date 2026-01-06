"use client"

import { useCustomer } from "autumn-js/react"

export function CreditWarning() {
  const { customer, check } = useCustomer()
  const isPro = check({ productId: "pro_plan" }).data.allowed

  const standardBalance = customer?.features?.standard_credits?.balance ?? 0
  const premiumBalance = customer?.features?.premium_credits?.balance ?? 0

  const lowStandard = standardBalance < 10 && standardBalance > 0
  const lowPremium = isPro && premiumBalance < 10 && premiumBalance > 0

  if (!(lowStandard || lowPremium)) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {lowStandard && (
        <span className="text-red-500">
          {standardBalance} standard credit{standardBalance !== 1 ? "s" : ""}{" "}
          left
        </span>
      )}
      {lowPremium && (
        <span className="text-red-500">
          {premiumBalance} premium credit{premiumBalance !== 1 ? "s" : ""} left
        </span>
      )}
    </div>
  )
}
