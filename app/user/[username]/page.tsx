import { desc, eq, sql } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/container"
import { List, ListItem, Subtitle, Title } from "@/components/typography"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { comments } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const origin = getSiteOrigin()

  return {
    openGraph: {
      images: [`${origin}/api/og/user?username=${username}`],
    },
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  "use cache"
  cacheLife("minutes")
  const { username } = await params

  const user = await gitHubUserLoader.load(username)

  if (!user) {
    notFound()
  }

  const recentComments = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      content: comments.content,
      createdAt: comments.createdAt,
      postTitle: sql<string | null>`(
        SELECT title FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postNumber: sql<number>`(
        SELECT number FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postOwner: sql<string>`(
        SELECT owner FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postRepo: sql<string>`(
        SELECT repo FROM posts WHERE posts.id = ${comments.postId}
      )`,
    })
    .from(comments)
    .where(eq(comments.authorUsername, username))
    .orderBy(desc(comments.createdAt))
    .limit(20)

  const totalComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorUsername, username))
    .then((r) => r[0]?.count ?? 0)

  return (
    <Container>
      <div className="mb-8 flex items-center gap-2.5">
        <img
          alt={user.name ?? username}
          className="h-14 w-14 rounded-full"
          src={user.image}
        />
        <div className="flex flex-col gap-0.5">
          <Title>{user.name ?? username}</Title>
          <Subtitle className="text-dim">
            <a
              className="hover:underline"
              href={`https://github.com/${username}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              @{username}
            </a>{" "}
            - {totalComments} comments
          </Subtitle>
        </div>
      </div>

      <div className="relative mb-2">
        <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
        <h2 className="relative z-10 w-fit bg-background pr-2 font-medium text-sm uppercase">
          Recent Comments
        </h2>
      </div>

      {recentComments.length === 0 ? (
        <p className="text-dim text-sm">No comments yet from this user.</p>
      ) : (
        <List>
          {recentComments.map((comment) => {
            const preview = comment.content[0]?.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text"
              )
              .map((p) => p.text)
              .join(" ")
              .slice(0, 200)

            return (
              <ListItem key={comment.id}>
                <Link
                  className="group flex grow items-start gap-1 overflow-hidden"
                  href={`/${comment.postOwner}/${comment.postRepo}/${comment.postNumber}`}
                >
                  <AsteriskIcon
                    className="mt-0.5 shrink-0 text-faint"
                    size={16}
                  />
                  <div className="min-w-0">
                    <span className="text-dim group-hover:text-bright group-hover:underline">
                      {comment.postTitle || `Post #${comment.postNumber}`}
                    </span>
                    <span className="ml-2 text-faint text-sm">
                      {comment.postOwner}/{comment.postRepo}
                    </span>
                    {!!preview && (
                      <p className="mt-0.5 truncate text-faint text-sm">
                        {preview}
                        {preview.length >= 200 && "..."}
                      </p>
                    )}
                  </div>
                </Link>
              </ListItem>
            )
          })}
        </List>
      )}
    </Container>
  )
}
