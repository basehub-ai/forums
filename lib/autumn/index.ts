import { Autumn } from "autumn-js"

export const autumn = new Autumn()

export const CREDIT_COSTS = {
  standard: 1,
  pro: 5,
} as const

export type BillingCategory = keyof typeof CREDIT_COSTS

export async function checkIsPro(userId: string): Promise<boolean> {
  const { data } = await autumn.check({
    customer_id: userId,
    product_id: "pro_plan",
  })
  return data?.allowed ?? false
}
