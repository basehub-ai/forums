import { autumn } from "autumn-js/better-auth"
import type { User } from "better-auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { oAuthProxy } from "better-auth/plugins"
import DataLoader from "dataloader"
import { eq } from "drizzle-orm"
import { cacheLife } from "next/cache"
import { productionOrigin } from "./constants"
import { db } from "./db/client"
import * as schema from "./db/schema"
import { redis } from "./redis"
import { getSiteOrigin } from "./utils"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
    },
  },
  secondaryStorage: {
    get: async (key) => await redis.get(`auth:${key}`),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(`auth:${key}`, value, { ex: ttl })
      } else {
        await redis.set(`auth:${key}`, value)
      }
    },
    delete: async (key) => {
      await redis.del(`auth:${key}`)
    },
  },
  session: {
    cookieCache: {
      version: "3",
      maxAge: 5 * 60,
      refreshCache: false,
    },
  },
  baseURL: getSiteOrigin(),
  plugins: [oAuthProxy({ productionURL: productionOrigin }), autumn()],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      overrideUserInfoOnSignIn: true,
    },
  },
  databaseHooks: {
    user: {
      update: {
        after: async (user) => {
          const githubUserId = extractGitHubUserId(user.image)
          if (!githubUserId) {
            return
          }
          const res = await fetch(
            `https://api.github.com/user/${githubUserId}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                }),
              },
            }
          )
          if (!res.ok) {
            return
          }
          const data = (await res.json()) as { login: string }
          if (user.username === data.login) {
            return
          }
          await Promise.all([
            db
              .update(schema.user)
              .set({ username: data.login })
              .where(eq(schema.user.id, user.id)),
            db
              .update(schema.comments)
              .set({ authorUsername: data.login })
              .where(eq(schema.comments.authorId, user.id)),
            db
              .update(schema.mentions)
              .set({ authorUsername: data.login })
              .where(eq(schema.mentions.authorId, user.id)),
          ])
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== "github") {
            return
          }
          const res = await fetch(
            `https://api.github.com/user/${account.accountId}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                }),
              },
            }
          )
          if (!res.ok) {
            return
          }
          const data = (await res.json()) as { login: string }
          await db
            .update(schema.user)
            .set({ username: data.login })
            .where(eq(schema.user.id, account.userId))
        },
      },
    },
  },
})

const ADMIN_USER_EMAILS = (process.env.ADMIN_USER_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean)

export const isAdmin = (user: User | null | undefined) => {
  return !!(
    user?.emailVerified &&
    user.email &&
    ADMIN_USER_EMAILS.includes(user.email)
  )
}

export type GitHubUserMetadata = { login: string; name: string; image: string }

const GITHUB_AVATAR_REGEX = /githubusercontent\.com\/u\/(\d+)/

export function extractGitHubUserId(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl) {
    return null
  }
  const match = imageUrl.match(GITHUB_AVATAR_REGEX)
  return match?.[1] ?? null
}

async function fetchGitHubUserById(
  userId: string
): Promise<GitHubUserMetadata | null> {
  "use cache"
  cacheLife("days")

  const res = await fetch(`https://api.github.com/user/${userId}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
  })

  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as {
    login: string
    name: string | null
    avatar_url: string
  }

  return {
    login: data.login,
    name: data.name || data.login,
    image: data.avatar_url,
  }
}

async function fetchGitHubUserByUsername(
  username: string
): Promise<GitHubUserMetadata | null> {
  "use cache"
  cacheLife("days")

  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
  })

  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as {
    login: string
    name: string | null
    avatar_url: string
  }

  return {
    login: data.login,
    name: data.name || data.login,
    image: data.avatar_url,
  }
}

export const gitHubUserLoader = new DataLoader<
  string,
  GitHubUserMetadata | null
>((usernames) => Promise.all(usernames.map(fetchGitHubUserByUsername)))

export const gitHubUserByIdLoader = new DataLoader<
  string,
  GitHubUserMetadata | null
>((userIds) => Promise.all(userIds.map(fetchGitHubUserById)))
