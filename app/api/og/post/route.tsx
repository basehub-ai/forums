import { and, eq } from "drizzle-orm"
import { readFile } from "fs/promises"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { join } from "path"
import { gitHubUserLoader } from "@/lib/auth"
import { getRootCommentText } from "@/lib/data/posts"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

const geistMonoRegular = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf"
  )
)
const geistMonoBold = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf"
  )
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const postNumberStr = searchParams.get("postNumber")

  if (!(owner && repo && postNumberStr)) {
    return new Response("Missing parameters", { status: 400 })
  }

  const postNumber = Number.parseInt(postNumberStr, 10)

  if (Number.isNaN(postNumber)) {
    return new Response("Invalid post number", { status: 400 })
  }

  const [post, fontRegular, fontBold] = await Promise.all([
    db
      .select({
        title: posts.title,
        number: posts.number,
        rootCommentId: posts.rootCommentId,
        authorId: posts.authorId,
      })
      .from(posts)
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .limit(1)
      .then((r) => r[0]),
    geistMonoRegular,
    geistMonoBold,
  ])

  const author = post?.authorId
    ? await gitHubUserLoader.load(post.authorId)
    : null

  const title = post?.title || `Post #${postNumber}`
  const body = post?.rootCommentId
    ? await getRootCommentText(post.rootCommentId)
    : null

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        backgroundColor: "#fafafa",
        padding: 60,
        fontFamily: "Geist Mono",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: "#09090b",
              lineHeight: 1.2,
              maxWidth: 1080,
            }}
          >
            {title}
          </div>
          {body && (
            <div
              style={{
                fontSize: 36,
                color: "#52525b",
                lineHeight: 1.5,
                maxWidth: 1080,
                display: "block",
                lineClamp: 2,
              }}
            >
              {body}
            </div>
          )}
        </div>
      </div>
      {author && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {author.image && (
            <img
              alt={author.name || post.authorId}
              height={48}
              src={author.image}
              style={{ borderRadius: 24 }}
              width={48}
            />
          )}
          <span
            style={{
              fontSize: 28,
              color: "#71717a",
            }}
          >
            {`@${post.authorId}`}
          </span>
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist Mono",
          data: fontRegular,
          weight: 400,
        },
        {
          name: "Geist Mono",
          data: fontBold,
          weight: 700,
        },
      ],
    }
  )
}
