"use client"

import { useCustomer } from "autumn-js/react"

export function CreditWarning() {
  const { customer } = useCustomer()

  if (!customer) {
    return null
  }

  const balance = customer.features?.standard_credits?.balance ?? 0

  if (balance >= 5) {
    return null
  }

  return (
    <span className="animate-fade-in text-red-500 text-xs">
      {balance} credit{balance !== 1 ? "s" : ""} left
    </span>
  )
}
