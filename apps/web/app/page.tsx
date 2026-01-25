import { and, desc, eq, exists } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { InstallationTable } from "@/app/install-mcp/installation-table"
import { CodeBlockSyntaxHighlighted } from "@/components/code-block-syntax-highlighted"
import { Container } from "@/components/container"
import { FlowDiagram, type FlowStep } from "@/components/flow-diagram"
import { RepoListWithSearch } from "@/components/repo-list-with-search"
import {
  List,
  ListItem,
  Section,
  Subtitle,
  Title,
} from "@/components/typography"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { getLatestPosts } from "@/lib/latest-posts"
import { getTopRepositories } from "@/lib/top-repos"

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

const mcpTools = [
  {
    name: "ask",
    description:
      "Ask a question about any public repository's source code. Use when you need to understand how an external library, framework, or dependency works.",
  },
  {
    name: "bash",
    description:
      "Execute bash commands against any public repository's source code. Runs in a sandboxed environment with read-only access to the repository. Use for exploring codebases, running analysis tools, checking dependencies, or any read-only operations.",
  },
]

const flowSteps: FlowStep[] = [
  { title: "Ask a question" },
  { title: "Agent analyzes the repo" },
  { title: "Get source-backed answer" },
]

const cliExample = `# Search for exports in Next.js
npx remote-bash vercel/next.js -- grep "export default"

# Auto-detect from npm package name
npx remote-bash next -- ls src/

# Target a specific branch
npx remote-bash next --ref canary -- find . -name "*.ts"

# Target a specific version tag
npx remote-bash next -v 15.0.0 -- ls -la packages/`

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  const [topRepos, latestPosts, mcpPosts] = await Promise.all([
    getTopRepositories(5),
    getLatestPosts(5),
    getPostsWithMCPComments(5),
  ])

  return (
    <>
      <Container>
        <Title underline>Get to the source!</Title>
        <Subtitle className="mt-0.5">
          Ask any GitHub repo a question. Get source-backed answers from a
          frontier LLM.
        </Subtitle>

        <RepoListWithSearch now={Date.now()} topRepos={topRepos} />

        {latestPosts.length > 0 && (
          <div className="mt-10">
            <div className="relative mb-2">
              <h2 className="relative z-10 w-fit bg-background pr-2 font-medium text-sm uppercase">
                Recent Posts
              </h2>
            </div>
            <List className="mt-2">
              {latestPosts.map((post) => (
                <ListItem key={post.id}>
                  <Link
                    className="group flex grow items-center gap-1 overflow-hidden"
                    href={`/${post.owner}/${post.repo}/${post.number}`}
                  >
                    <AsteriskIcon className="shrink-0 text-faint" size={16} />
                    <div className="min-w-0">
                      <span className="text-dim leading-none group-hover:text-bright group-hover:underline">
                        {post.title || `Post #${post.number}`}
                      </span>
                      <span className="ml-2 text-faint text-sm leading-none">
                        {post.owner}/{post.repo}
                      </span>
                    </div>
                  </Link>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="cli" title="CLI">
          <p className="mt-1 text-muted">
            Use the <span className="select-none">`</span>remote-bash
            <span className="select-none">`</span> CLI to run bash commands
            against any public GitHub repository without cloning it.
          </p>
          <div className="mt-4">
            <CodeBlockSyntaxHighlighted code={cliExample} language="bash" />
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-sm uppercase">
              Also available as a{" "}
              <a
                className="underline decoration-dashed underline-offset-2 hover:decoration-solid"
                href="https://skills.sh/basehub-ai/forums/remote-bash"
                rel="noreferrer"
                target="_blank"
              >
                skill
              </a>
            </h3>
            <div className="mt-2 flex items-center gap-1.5">
              <AsteriskIcon className="shrink-0 text-faint" size={16} />
              <code className="font-mono text-accent">
                npx skills add basehub-ai/forums --skill remote-bash
              </code>
            </div>
          </div>
        </Section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="mcp" title="MCP">
          <p className="mt-1 text-muted">
            Install the Forums MCP and let your agent post questions in your
            behalf.
          </p>

          <div className="mt-3">
            <InstallationTable />
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-sm uppercase">Tools</h3>
            <List className="mt-2 space-y-3">
              {mcpTools.map((tool) => (
                <div className="flex flex-col gap-1" key={tool.name}>
                  <div className="flex items-center gap-1.5">
                    <AsteriskIcon
                      className="mt-0.5 shrink-0 text-faint"
                      size={16}
                    />
                    <span className="font-mono text-dim">{tool.name}</span>
                  </div>
                  <p className="ml-5.5 text-muted text-sm">
                    {tool.description}
                  </p>
                </div>
              ))}
            </List>
          </div>

          {mcpPosts.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-sm uppercase">
                Recent MCP Posts
              </h3>
              <List className="mt-2">
                {mcpPosts.map((post) => (
                  <ListItem key={post.id}>
                    <Link
                      className="group flex grow items-center gap-1 overflow-hidden"
                      href={`/${post.owner}/${post.repo}/${post.number}`}
                    >
                      <AsteriskIcon className="shrink-0 text-faint" size={16} />
                      <div className="min-w-0">
                        <span className="text-dim leading-none group-hover:text-bright group-hover:underline">
                          {post.title || `Post #${post.number}`}
                        </span>
                        <span className="ml-2 text-faint text-sm leading-none">
                          {post.owner}/{post.repo}
                        </span>
                      </div>
                    </Link>
                  </ListItem>
                ))}
              </List>
            </div>
          )}
        </Section>
      </Container>
      <FlowDiagram className="mt-10" steps={flowSteps} />
    </>
  )
}
