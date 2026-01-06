import { Autumn } from "autumn-js"

export const autumn = new Autumn()

export const TOKEN_THRESHOLDS = {
  TIER_1_MAX: 10_000,
  TIER_2_MAX: 50_000,
}

export function calculateCredits(totalTokens: number): number {
  if (totalTokens < TOKEN_THRESHOLDS.TIER_1_MAX) {
    return 1
  }
  if (totalTokens < TOKEN_THRESHOLDS.TIER_2_MAX) {
    return 2
  }
  return 3
}

export const FEATURE_IDS = {
  standard: "standard_credits",
  premium: "premium_credits",
} as const

export type BillingCategory = keyof typeof FEATURE_IDS

export async function checkIsPro(userId: string): Promise<boolean> {
  const { data } = await autumn.check({
    customer_id: userId,
    product_id: "pro_plan",
  })
  return data?.allowed ?? false
}
