import { betterAuth } from "better-auth"
import { oAuthProxy } from "better-auth/plugins"
import { productionOrigin } from "./constants"
import { redis } from "./redis"

export const auth = betterAuth({
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, value, { ex: ttl })
      } else {
        await redis.set(key, value)
      }
    },
    delete: async (key) => {
      await redis.del(key)
    },
  },
  session: {
    cookieCache: {
      maxAge: 5 * 60,
      refreshCache: false,
    },
  },
  plugins: [oAuthProxy({ productionURL: productionOrigin })],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      redirectURI: `${productionOrigin}/api/auth/callback/github`,
    },
  },
})
