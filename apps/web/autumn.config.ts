import { feature, featureItem, priceItem, product } from "atmn"

// Features
export const standardCredits = feature({
  id: "standard_credits",
  name: "Standard Credits",
  type: "single_use",
})

export const boosts = feature({
  id: "boosts",
  name: "Repo Boost",
  type: "single_use",
})

// Products
export const freePlan = product({
  id: "free_plan",
  name: "Free Plan",
  is_default: true,
  items: [
    featureItem({
      feature_id: standardCredits.id,
      included_usage: 5,
      interval: "day",
    }),
  ],
})

export const proPlan = product({
  id: "pro_plan",
  name: "Pro Plan",
  items: [
    priceItem({
      price: 10,
      interval: "month",
    }),

    featureItem({
      feature_id: standardCredits.id,
      included_usage: 1500,
      interval: "month",
    }),
  ],
})
