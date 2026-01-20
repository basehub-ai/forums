import { and, eq } from "drizzle-orm"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import slugify from "slugify"
import { db } from "@/lib/db/client"
import { categories } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

function categorySlugify(title: string) {
  return slugify(title, { lower: true, strict: true })
}

async function getCategoryBySlug(owner: string, repo: string, slug: string) {
  const repoCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))

  return repoCategories.find((c) => categorySlugify(c.title) === slug)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const categorySlug = searchParams.get("categorySlug")

  if (!(owner && repo && categorySlug)) {
    return new Response("Missing parameters", { status: 400 })
  }

  const category = await getCategoryBySlug(owner, repo, categorySlug)

  const title = category ? `${category.emoji} ${category.title}` : "Category"

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: "#fafafa",
        padding: 60,
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          alt="Forums"
          height={40}
          src={`${getSiteOrigin()}/icon.svg`}
          width={40}
        />
        <span
          style={{
            fontSize: 36,
            color: "#71717a",
          }}
        >
          {`${owner}/${repo}`}
        </span>
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: "#09090b",
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
    </div>,
    {
      ...size,
    }
  )
}
