"use client"

import { ChevronRight, PinIcon, TagIcon, TrashIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useState, useTransition } from "react"
import slugify from "slugify"
import { Subtitle, Title } from "@/components/typography"
import { Menu } from "@/components/ui/menu"
import { Tooltip } from "@/components/ui/tooltip"
import { VisibilityBadge } from "@/components/visibility-badge"
import { pinPost, unpinPost } from "@/lib/actions/moderation"
import { rerunLlmCommentsInPost } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"
import { useDialogStore } from "@/lib/stores/dialogs"
import { useRepoPermissions } from "../repo-permissions-context"
import { usePostMetadata } from "./post-metadata-context"

function categorySlugify(title: string) {
  return slugify(title, { lower: true, strict: true })
}

export function PostHeader({
  owner,
  repo,
  postNumber,
}: {
  owner: string
  repo: string
  postNumber: number
}) {
  const { title, category, gitContext, archivedRefs, visibility } =
    usePostMetadata()
  const hasArchivedRefs = archivedRefs.length > 0

  return (
    <header>
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <Link className="hover:underline" href={`/${owner}/${repo}`}>
            <Subtitle>
              {owner}/{repo}
            </Subtitle>
          </Link>
          {category && (
            <>
              <Subtitle className="select-none">
                <ChevronRight size={14} />
              </Subtitle>
              <Link
                className="hover:underline"
                href={`/${owner}/${repo}/category/${categorySlugify(category.title)}`}
              >
                <Subtitle>{category.title}</Subtitle>
              </Link>
            </>
          )}
          {visibility !== "public" && (
            <>
              <Subtitle className="select-none">
                <ChevronRight size={14} />
              </Subtitle>
              <VisibilityBadge visibility={visibility} />
            </>
          )}
        </div>
        <div className="absolute top-0 right-0">
          <ModerateMenu />
        </div>
      </div>

      {typeof title === "string" ? (
        <Title className="mt-1">{title || `Post #${postNumber}`}</Title>
      ) : (
        <h1 className="relative mt-1 overflow-hidden font-medium text-2xl text-muted-foreground">
          <span>Generating title...</span>
          <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </h1>
      )}

      {gitContext ? (
        <div className="mt-2 flex items-center gap-4 text-sm">
          <Link
            className="flex items-center gap-1 bg-highlight-blue px-1.5 py-0.5 font-medium text-white"
            href={`https://github.com/${owner}/${repo}/tree/${gitContext.branch}`}
            target="_blank"
          >
            {gitContext.branch}
          </Link>
          {gitContext.tags.length > 0 && (
            <Link
              className="flex items-center gap-1 overflow-hidden"
              href={`https://github.com/${owner}/${repo}/releases/tag/${gitContext.tags[0]}`}
              target="_blank"
            >
              <TagIcon className="h-3.5 w-3.5" />
              <span className="truncate">{gitContext.tags[0]}</span>
            </Link>
          )}
          <div className="flex items-center gap-1 overflow-hidden">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <Link
                      className="underline decoration-dotted underline-offset-2"
                      href={`https://github.com/${owner}/${repo}/commit/${gitContext.sha}`}
                      target="_blank"
                    >
                      {gitContext.sha.slice(0, 7)}
                    </Link>
                  }
                />
                <Tooltip.Popup>Exploring code at this commit.</Tooltip.Popup>
              </Tooltip.Root>
            </Tooltip.Provider>
            <span className="truncate">
              <CommitMessage
                message={gitContext.message}
                owner={owner}
                repo={repo}
              />
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 h-6 text-muted-foreground text-sm">Loading...</div>
      )}

      <StaleBanner />
      {hasArchivedRefs && <RefSelector />}
    </header>
  )
}

function RefSelector() {
  const { gitContext, archivedRefs, selectedRef, setSelectedRef } =
    usePostMetadata()

  if (!gitContext) {
    return null
  }

  const currentSha = gitContext.sha

  return (
    <div className="mt-4 flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Viewing response from:</span>
      <select
        className="border border-faint bg-shade px-2 py-1 text-bright"
        onChange={(e) =>
          setSelectedRef(e.target.value === currentSha ? null : e.target.value)
        }
        value={selectedRef ?? currentSha}
      >
        <option value={currentSha}>{currentSha.slice(0, 7)} (current)</option>
        {archivedRefs.map((ref) => (
          <option key={ref} value={ref}>
            {ref.slice(0, 7)} (archived)
          </option>
        ))}
      </select>
    </div>
  )
}

function ModerateMenu() {
  const { postId, pinned } = usePostMetadata()
  const { canModerate, isLoading } = useRepoPermissions()
  const [isPinned, setIsPinned] = useState(pinned)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const setModeratorDeletePostDialog = useDialogStore(
    (s) => s.setModeratorDeletePostDialog
  )

  if (!canModerate || isLoading) {
    return null
  }

  function handlePin() {
    startTransition(async () => {
      if (isPinned) {
        await unpinPost(postId)
        setIsPinned(false)
      } else {
        await pinPost(postId)
        setIsPinned(true)
      }
      router.refresh()
    })
  }

  function handleDelete() {
    setModeratorDeletePostDialog({ postId })
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="shrink-0">Moderate</Menu.Trigger>
      <Menu.Popup align="end">
        <Menu.Item disabled={isPending} onClick={handlePin}>
          <PinIcon size={14} />
          {isPinned ? "Unpin post" : "Pin post"}
        </Menu.Item>
        <Menu.Item
          className="text-highlight-red data-highlighted:text-highlight-red"
          disabled={isPending}
          onClick={handleDelete}
        >
          <TrashIcon size={14} />
          Delete post
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  )
}

function StaleBanner() {
  const { staleInfo, gitContext, owner, repo, postId, authorId } =
    usePostMetadata()
  const session = authClient.useSession()
  const userId = session.data?.user.id
  const isAuthor = userId === authorId
  const { canModerate, isLoading } = useRepoPermissions()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!(staleInfo && gitContext)) {
    return null
  }

  const canRerun = (isAuthor || canModerate) && !isLoading

  function handleRerun() {
    startTransition(async () => {
      await rerunLlmCommentsInPost({ postId, updateGitContext: true })
      router.refresh()
    })
  }

  return (
    <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2 border-faint border-l-2 bg-shade px-2 py-1 font-medium text-faint text-sm">
      <span className="min-w-0">
        This post might have stale content, as{" "}
        <Link
          className="underline hover:text-muted"
          href={`https://github.com/${owner}/${repo}/tree/${gitContext.branch}`}
          target="_blank"
        >
          {gitContext.branch}
        </Link>{" "}
        is{" "}
        <Link
          className="underline hover:text-muted"
          href={`https://github.com/${owner}/${repo}/compare/${gitContext.sha}...${gitContext.branch}`}
          target="_blank"
        >
          {staleInfo.commitsAhead} commit
          {staleInfo.commitsAhead !== 1 ? "s" : ""} ahead
        </Link>
        .
      </span>
      {canRerun && (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <button
                  className="shrink-0 bg-highlight-yellow px-1.5 py-0.5 text-white disabled:opacity-50 dark:text-black"
                  disabled={isPending}
                  onClick={handleRerun}
                  type="button"
                >
                  {isPending ? "Re-running..." : "Re-run"}
                </button>
              }
            />
            <Tooltip.Popup>Re-run with latest content</Tooltip.Popup>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  )
}

function CommitMessage({
  message,
  owner,
  repo,
}: {
  message: string
  owner: string
  repo: string
}) {
  const parts: ReactNode[] = []
  const regex = /#(\d+)/g
  let lastIndex = 0
  const matches = [...message.matchAll(regex)]

  for (const match of matches) {
    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index))
    }
    const prNumber = match[1]
    parts.push(
      <a
        className="text-highlight-blue hover:underline"
        href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
        key={match.index}
        onClick={(e) => e.stopPropagation()}
        rel="noopener"
        target="_blank"
      >
        #{prNumber}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex))
  }

  return <>{parts}</>
}
