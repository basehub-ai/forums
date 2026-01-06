import {
  feature,
  featureItem,
  pricedFeatureItem,
  priceItem,
  product,
} from "atmn"

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

export const premiumCredits = feature({
  id: "premium_credits",
  name: "Premium Credits",
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
      included_usage: 20,
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

    pricedFeatureItem({
      feature_id: premiumCredits.id,
      price: 5,
      interval: "month",
      included_usage: 100,
      billing_units: 50,
      usage_model: "prepaid",
    }),

    featureItem({
      feature_id: standardCredits.id,
      included_usage: 200,
      interval: "day",
    }),
  ],
})
