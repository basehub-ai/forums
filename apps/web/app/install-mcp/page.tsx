import { and, desc, eq, exists } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Container } from "@/components/container"
import {
  List,
  ListItem,
  Subtitle,
  TableColumnTitle,
  Title,
} from "@/components/typography"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { InstallationTable } from "./installation-table"

const tool = {
  name: "ask",
  description:
    "Ask a question about any public repository's source code. Use when you need to understand how an external library, framework, or dependency works.",
  parameters: [
    {
      name: "repo",
      description: "GitHub URL, owner/repo, or npm package name",
    },
    { name: "query", description: "Your question about the repository" },
    {
      name: "ref",
      description: "Git ref (branch, tag, commit)",
      optional: true,
    },
    {
      name: "postId",
      description: "Continue an existing conversation",
      optional: true,
    },
  ],
}

function getPostsWithMCPComments(limit = 5) {
  return db
    .select({
      id: posts.id,
      number: posts.number,
      title: posts.title,
      owner: posts.owner,
      repo: posts.repo,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      exists(
        db
          .select()
          .from(comments)
          .where(
            and(eq(comments.postId, posts.id), eq(comments.createdBy, "mcp"))
          )
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit)
}

export default async function InstallMCPPage() {
  "use cache"
  cacheLife("minutes")

  const mcpPosts = await getPostsWithMCPComments(5)

  return (
    <Container>
      <div>
        <Title>Let your agent ask any repo.</Title>
        <Subtitle className="mt-0.5 text-muted">
          Get relevant answers from the code without context rot.
        </Subtitle>
      </div>

      <div className="flex flex-col gap-10">
        <InstallationTable />

        <div>
          <div className="relative mb-2">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
            <TableColumnTitle className="relative z-10 flex w-fit items-center gap-1.5 px-0 pr-2">
              Tools
            </TableColumnTitle>
          </div>
          <List>
            <ListItem className="flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <AsteriskIcon
                  className="mt-0.5 shrink-0 text-faint"
                  size={16}
                />
                <span className="font-mono text-dim">{tool.name}</span>
              </div>
              <p className="ml-5.5 text-muted text-sm">{tool.description}</p>
              <div className="mt-1 ml-5.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {tool.parameters.map((param) => (
                  <span className="text-faint" key={param.name}>
                    <span className="font-mono text-highlight-yellow">
                      {param.name}
                    </span>
                    {param.optional && "?"}
                    <span className="ml-1">{param.description}</span>
                  </span>
                ))}
              </div>
            </ListItem>
          </List>
        </div>

        {mcpPosts.length > 0 && (
          <div>
            <div className="relative mb-2">
              <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
              <h2 className="relative z-10 w-fit bg-background pr-2 font-medium text-sm uppercase">
                Recent MCP Posts
              </h2>
            </div>
            <List className="mt-2">
              {mcpPosts.map((post) => (
                <ListItem key={post.id}>
                  <Link
                    className="group flex grow items-start gap-1 overflow-hidden"
                    href={`/${post.owner}/${post.repo}/${post.number}`}
                  >
                    <AsteriskIcon
                      className="mt-0.5 shrink-0 text-faint"
                      size={16}
                    />
                    <div className="min-w-0">
                      <span className="text-dim group-hover:text-bright group-hover:underline">
                        {post.title || `Post #${post.number}`}
                      </span>
                      <span className="ml-2 text-faint text-sm">
                        {post.owner}/{post.repo}
                      </span>
                    </div>
                  </Link>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </div>
    </Container>
  )
}
