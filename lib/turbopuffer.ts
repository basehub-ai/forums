import { Turbopuffer } from "@turbopuffer/turbopuffer"

if (!process.env.TURBOPUFFER_API_KEY) {
  throw new Error("TURBOPUFFER_API_KEY is not set")
}

export const turbopuffer = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY,
})

export const reposNamespace = turbopuffer.namespace("forums-repos")
