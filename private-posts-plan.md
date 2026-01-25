# Private Repository + Visibility Support Plan

## Summary

Add support for:
1. **Private GitHub repos** - only users with repo access can see posts
2. **Personal notes** - posts visible only to the author

---

## Phase 1: Foundation (Schema, Types, Core Functions)

Get the building blocks in place before tackling rendering.

### Checklist

- [ ] **Database schema** - Add `visibility` column to posts table
  - `lib/db/schema.ts` - varchar with default "public"
  - Run migration

- [ ] **Visibility types & parser** - Create `lib/data/visibility.ts`
  - [ ] `Visibility` type union: `"public" | "repo"` (schema supports `user:<username>` for future)
  - [ ] `ParsedVisibility` type: `{ type: "public" } | { type: "repo" } | { type: "user"; username: string }`
  - [ ] `parseVisibility(visibility: string): ParsedVisibility`

- [ ] **Permission functions** - Create `lib/data/permissions.ts`
  - [ ] `canAccessPrivateRepo({ userId, owner, repo }): Promise<boolean>`
  - [ ] `canViewPost({ post, userId }): Promise<boolean>`

- [ ] **GitHub API updates** - Modify `lib/data/github.ts`
  - [ ] `getGithubRepo()` accepts optional `userAccessToken` param
  - [ ] `getGithubRepo()` returns `private: boolean` field
  - [ ] `getUserRepoPermissions()` - new function to check user's repo access

- [ ] **Repo resolution** - Modify `lib/resolve-repo-input.ts`
  - [ ] Accept optional `userAccessToken` param
  - [ ] Return `isPrivate: boolean` field
  - [ ] Stop throwing on 403 (only throw on 404)

---

## Phase 2: Actions & Data Layer

Wire up the ability to create/read posts with visibility.

### Checklist

- [ ] **Posts actions** - Modify `lib/actions/posts.ts`
  - [ ] Accept `visibility` param in create post action
  - [ ] Validate: only "public" or "repo" allowed
  - [ ] Default to "public" for public repos, "repo" for private repos
  - [ ] Validate: can't set "repo" visibility on a public repo

- [ ] **Posts queries** - Create/modify post fetching functions
  - [ ] `getPublicPosts({ owner, repo })` - visibility="public" only
  - [ ] `getRepoPosts({ owner, repo, userId })` - visibility in ("public", "repo"), requires access check

- [ ] **Post access check** - Add to individual post fetch
  - [ ] Check `canViewPost()` before returning post data
  - [ ] Return 404 for unauthorized access

---

## Phase 3: Caching & Rendering (The Hard Part)

Set up the `use cache` / `use cache: private` component structure.

### Key Constraints
- `'use cache'` (public) CANNOT nest inside `'use cache'` ❌
- `'use cache: private'` CANNOT nest inside `'use cache'` ❌
- `'use cache: private'` CAN nest inside `'use cache: private'` ✅

### Checklist

- [ ] **Repo page split** - `app/[owner]/[repo]/page.tsx`
  - [ ] Top-level: try public fetch first (no token)
  - [ ] If 403/private → dynamic branch with session check
  - [ ] Public path: `<RepoHeader>` + `<PublicPosts>` (both `'use cache'`)
  - [ ] Private path: `<PrivateRepoContent>` in Suspense with skeleton (`'use cache: private'`)

- [ ] **Cached components** - Create/split components
  - [ ] `RepoHeader` - `'use cache'`, `cacheTag(\`repo:${owner}:${repo}\`)`
  - [ ] `PublicPosts` - `'use cache'`, `cacheTag(\`repo:${owner}:${repo}:posts\`)`
  - [ ] `PrivateRepoContent` - `'use cache: private'`, fetches public + repo posts

- [ ] **Post page** - `app/[owner]/[repo]/[postNumber]/page.tsx`
  - [ ] Check post visibility before rendering
  - [ ] Public posts: `'use cache'` path
  - [ ] Private/repo/user posts: `'use cache: private'` path with access check
  - [ ] Redirect to login if not authenticated for non-public posts

- [ ] **Static generation** - `generateStaticParams()`
  - [ ] Only return public posts
  - [ ] Private/repo posts render dynamically at runtime

- [ ] **Skeleton components** - Create loading states
  - [ ] `<PageSkeleton>` for private repo pages
  - [ ] Ensure public pages have no visible loading flash

---

## Phase 4: Search & Indexing

Search only indexes public posts. Private repo posts are not searchable.

### Checklist

- [ ] **Typesense schema** - Update `lib/typesense-index.ts`
  - [ ] Add `visibility` field to post schema

- [ ] **Indexing logic** - Only index public posts
  - [ ] Skip indexing posts with `visibility !== "public"`
  - [ ] Remove from index if post visibility changes to non-public

- [ ] **Re-index** - Migration task
  - [ ] Script to re-index existing posts with visibility field

---

## Phase 5: UI Components

User-facing visibility controls and indicators.

### Checklist

- [ ] **Visibility badge** - Create `components/visibility-badge.tsx`
  - [ ] Globe icon for public (or no badge - it's the default)
  - [ ] Lock icon + "Repo members" for repo

- [ ] **Post composer** - Add visibility selector (private repos only)
  - [ ] Dropdown or radio: "Public" vs "Repo members only"
  - [ ] Only show selector when repo is private
  - [ ] Default to "repo" for private repos

---

## Phase 6: Migration & Verification

Ship it safely.

### Checklist

- [ ] **Database migration**
  - [ ] Add `visibility` column with `default("public")`
  - [ ] No backfill needed - existing posts stay public

- [ ] **Typesense re-index**
  - [ ] Run re-index script
  - [ ] Verify search results

- [ ] **Manual testing**
  - [ ] Create post on public repo → defaults to "public"
  - [ ] Create post on private repo (with access) → defaults to "repo"
  - [ ] Sign out → only public posts visible
  - [ ] Different user without repo access → can't see "repo" posts
  - [ ] Different user with repo access → can see "repo" posts
  - [ ] Search → only returns public posts (private repo posts not indexed)
  - [ ] Build → only public posts statically generated

- [ ] **Edge cases / decisions**
  - [ ] User loses repo access → "repo" posts hidden from them
  - [ ] Repo goes public → "repo" posts stay "repo" visibility (don't auto-change)

---

## Reference: Visibility Format

```typescript
visibility: varchar("visibility", { length: 255 }).notNull().default("public"),
// "public" - anyone can see
// "repo" - only users with GitHub repo access
// "user:<username>" - reserved for future (personal notes)
```

**Parsing:**
```typescript
function parseVisibility(visibility: string):
  | { type: "public" }
  | { type: "repo" }
  | { type: "user"; username: string } {
  if (visibility === "public") return { type: "public" }
  if (visibility === "repo") return { type: "repo" }
  if (visibility.startsWith("user:")) {
    return { type: "user", username: visibility.slice(5) }
  }
  return { type: "public" } // fallback
}
```

> **Note:** Parser handles `user:` for future extensibility, but UI only exposes "public" and "repo".

---

## Reference: Access Control

```typescript
export async function canViewPost(args: {
  post: { visibility: string; owner: string; repo: string }
  userId: string | null
}): Promise<boolean> {
  const { post, userId } = args
  const vis = parseVisibility(post.visibility)

  if (vis.type === "public") return true
  if (!userId) return false

  if (vis.type === "repo") {
    return canAccessPrivateRepo({ userId, owner: post.owner, repo: post.repo })
  }

  // Future: handle vis.type === "user" for personal notes

  return false
}

export async function canAccessPrivateRepo(args: {
  userId: string
  owner: string
  repo: string
}): Promise<boolean> {
  const token = await getUserAccessToken({ userId: args.userId })
  if (!token) return false
  const perms = await getUserRepoPermissions({
    owner: args.owner,
    repo: args.repo,
    accessToken: token,
  })
  return perms?.pull || perms?.push || perms?.admin
}
```

---

## Reference: Caching Rules

From Next.js source:

1. `'use cache: private'` can nest inside `'use cache: private'` ✅
2. `'use cache'` (public) CANNOT nest inside `'use cache'` ❌ (error)
3. `'use cache: private'` CANNOT nest inside `'use cache'` ❌ (error)

**Security implication:** If top-level is `'use cache: private'`, children can only be private too.

### When Suspense Fallbacks Show

- **Static generation**: Content prerendered at build → **no fallback shown**
- **First dynamic request**: Fallback shows while cache populates
- **Subsequent cached requests**: **No fallback**, cached content served

---

## Reference: Page Structure

```typescript
// app/[owner]/[repo]/page.tsx

export default async function RepoPage(props: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await props.params

  // Try public fetch first (no user token)
  const repoInfo = await getGithubRepo({ owner, repo })

  // 403 or marked private → private branch
  if (!repoInfo || repoInfo.private) {
    // Must check access - makes page dynamic
    const session = await getSession()
    if (!session) redirect(`/login?returnTo=/${owner}/${repo}`)

    // Retry with user token
    const userToken = await getUserAccessToken({ userId: session.user.id })
    const privateRepoInfo = await getGithubRepo({ owner, repo, userAccessToken: userToken })

    if (!privateRepoInfo) notFound() // truly doesn't exist

    const hasAccess = await canAccessPrivateRepo({
      userId: session.user.id,
      owner,
      repo,
    })
    if (!hasAccess) notFound()

    // Private repo content - dynamic with skeleton
    return (
      <Suspense fallback={<PageSkeleton />}>
        <PrivateRepoContent owner={owner} repo={repo} repoInfo={privateRepoInfo} />
      </Suspense>
    )
  }

  // Public repo - fully cacheable
  return (
    <>
      <RepoHeader owner={owner} repo={repo} repoInfo={repoInfo} />
      <PublicPosts owner={owner} repo={repo} />
    </>
  )
}

// Public content - server cached
async function RepoHeader(props: { owner: string; repo: string; repoInfo: GithubRepoData }) {
  'use cache'
  cacheLife('hours')
  cacheTag(`repo:${props.owner}:${props.repo}`)
  // render header with repoInfo
}

async function PublicPosts(props: { owner: string; repo: string }) {
  'use cache'
  cacheLife('hours')
  cacheTag(`repo:${props.owner}:${props.repo}:posts`)
  // fetch visibility="public" posts only
}

// Private repo - all content uses private cache
async function PrivateRepoContent(props: { owner: string; repo: string; repoInfo: GithubRepoData }) {
  'use cache: private'
  cacheLife({ stale: 60 })

  const session = await getSession()
  // fetch public + repo posts
}
```

---

## Reference: UI Components

```tsx
import { Lock } from "lucide-react"

export function VisibilityBadge(props: { visibility: string }) {
  const vis = parseVisibility(props.visibility)

  // Public posts don't need a badge (it's the default)
  if (vis.type === "public") return null

  if (vis.type === "repo") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" absoluteStrokeWidth />
        Repo members
      </span>
    )
  }

  return null
}
```
