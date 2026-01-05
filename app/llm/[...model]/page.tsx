import { desc, eq, sql } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/container"
import { List, ListItem, Subtitle, Title } from "@/components/typography"
import { db } from "@/lib/db/client"
import { comments, llmUsers } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model: string[] }>
}): Promise<Metadata> {
  const { model: modelSplit } = await params
  const model = modelSplit.join("/")
  const origin = getSiteOrigin()

  return {
    openGraph: {
      images: [`${origin}/api/og/llm?model=${encodeURIComponent(model)}`],
    },
  }
}

export const generateStaticParams = async () => {
  const allLlmUsers = await db.select().from(llmUsers)
  return allLlmUsers.map((u) => ({ id: u.id }))
}

export default async function LlmProfilePage({
  params,
}: {
  params: Promise<{ model: string[] }>
}) {
  "use cache"
  cacheLife("minutes")
  const { model: modelSplit } = await params
  const model = modelSplit.join("/")

  const [llmUser] = await db
    .select()
    .from(llmUsers)
    .where(eq(llmUsers.model, model))
    .limit(1)

  if (!llmUser) {
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
    .where(eq(comments.authorId, llmUser.id))
    .orderBy(desc(comments.createdAt))
    .limit(20)

  const totalComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorId, llmUser.id))
    .then((r) => r[0]?.count ?? 0)

  return (
    <Container>
      <div className="mb-8 flex items-center gap-3">
        {!!llmUser.image && (
          <img
            alt={llmUser.name}
            className="h-12 w-12 rounded-full"
            src={llmUser.image}
          />
        )}
        <div>
          <Title>{llmUser.name}</Title>
          <Subtitle className="text-dim">
            {llmUser.provider} &middot; {totalComments} responses
          </Subtitle>
          {!!llmUser.deprecatedAt && (
            <p className="mt-1 text-amber-600 text-sm">
              This model was deprecated on{" "}
              {new Date(llmUser.deprecatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-4 font-medium text-sm uppercase">Recent Responses</h2>

      {recentComments.length === 0 ? (
        <p className="text-dim text-sm">No responses yet from this model.</p>
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
