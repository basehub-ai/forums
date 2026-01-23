import { Sandbox } from "@vercel/sandbox"
import ms from "ms"
import { ResultAsync } from "neverthrow"
import type { AgentMode, GitContextData } from "@/agent/types"
import {
  extendPostSandboxTTL,
  extendSandboxTTL,
  getOrLockPostSandbox,
  getOrLockSandbox,
  releasePostSandboxLock,
  releaseSandboxLock,
  removePostSandboxIf,
  removeSandboxIf,
  storePostSandbox,
  storeSandbox,
} from "@/lib/redis"
export type GitContext = {
  owner: string
  repo: string
  ref?: string
}

const timeout = ms("10m")
const CREATION_LOCK_TTL = ms("30s")
const MAX_RETRIES = 10
const BASE_RETRY_DELAY = 100

export type Workspace = {
  path: string
  sandbox: Sandbox
  gitContextData: GitContextData
}

const cleanupRegex = /^\.\./

const sleep = (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration))

async function tryRetrieveSandbox(sandboxId: string): Promise<Sandbox | null> {
  const result = await ResultAsync.fromPromise(
    Sandbox.get({ sandboxId }),
    (e) => e
  ).mapErr((err) => {
    console.error(`Failed to retrieve sandbox ${sandboxId}:`, err)
    return err
  })

  return result.isOk() ? result.value : null
}

async function createSandbox(): Promise<Sandbox> {
  const result = await ResultAsync.fromPromise(
    Sandbox.create({ resources: { vcpus: 2 }, timeout }),
    (e) => e
  ).mapErr((err) => {
    console.error("Failed to create sandbox:", err)
    return err
  })

  if (result.isOk()) {
    return result.value
  }
  throw new Error("Failed to create sandbox")
}

async function extendSandboxTimeout(
  sandbox: Sandbox,
  gitContext: GitContext,
  postId?: string
): Promise<void> {
  const result = await ResultAsync.fromPromise(
    sandbox.extendTimeout(timeout),
    (e) => e
  )

  if (result.isErr()) {
    console.error(
      `Failed to extend timeout for ${sandbox.sandboxId}:`,
      result.error
    )
    return
  }

  if (postId) {
    await extendPostSandboxTTL(
      gitContext.owner,
      gitContext.repo,
      postId,
      timeout
    )
  } else {
    await extendSandboxTTL(gitContext.owner, gitContext.repo, timeout)
  }
}

async function getOrCreateSharedSandbox(
  gitContext: GitContext,
  retryCount = 0
): Promise<Sandbox> {
  const { owner, repo } = gitContext

  const result = await getOrLockSandbox(owner, repo, CREATION_LOCK_TTL)

  if (result.type === "existing") {
    const sandbox = await tryRetrieveSandbox(result.sandboxId)

    if (sandbox) {
      await extendSandboxTimeout(sandbox, gitContext)
      return sandbox
    }
    console.warn(
      `Stale sandbox ${result.sandboxId} for ${owner}/${repo}, removing`
    )
    await removeSandboxIf(owner, repo, result.sandboxId)
    return getOrCreateSharedSandbox(gitContext, retryCount)
  }

  if (result.type === "create") {
    try {
      const sandbox = await createSandbox()

      await storeSandbox(owner, repo, sandbox.sandboxId, timeout)

      console.log(
        `Created shared sandbox ${sandbox.sandboxId} for ${owner}/${repo}`
      )

      return sandbox
    } catch (error) {
      await releaseSandboxLock(owner, repo)
      throw error
    }
  }

  if (retryCount >= MAX_RETRIES) {
    throw new Error(
      `Timed out waiting for sandbox creation for ${owner}/${repo}`
    )
  }

  const delay = BASE_RETRY_DELAY * 2 ** retryCount
  const jitter = Math.random() * delay * 0.1
  await sleep(delay + jitter)

  return getOrCreateSharedSandbox(gitContext, retryCount + 1)
}

async function getOrCreateBuildSandbox(
  gitContext: GitContext,
  postId: string,
  retryCount = 0
): Promise<Sandbox> {
  const { owner, repo } = gitContext

  const result = await getOrLockPostSandbox(
    owner,
    repo,
    postId,
    CREATION_LOCK_TTL
  )

  if (result.type === "existing") {
    const sandbox = await tryRetrieveSandbox(result.sandboxId)

    if (sandbox) {
      await extendSandboxTimeout(sandbox, gitContext, postId)
      return sandbox
    }
    console.warn(
      `Stale build sandbox ${result.sandboxId} for ${owner}/${repo}/${postId}, removing`
    )
    await removePostSandboxIf(owner, repo, postId, result.sandboxId)
    return getOrCreateBuildSandbox(gitContext, postId, retryCount)
  }

  if (result.type === "create") {
    try {
      const sandbox = await createSandbox()

      await storePostSandbox(owner, repo, postId, sandbox.sandboxId, timeout)

      console.log(
        `Created build sandbox ${sandbox.sandboxId} for ${owner}/${repo}/${postId}`
      )

      return sandbox
    } catch (error) {
      await releasePostSandboxLock(owner, repo, postId)
      throw error
    }
  }

  if (retryCount >= MAX_RETRIES) {
    throw new Error(
      `Timed out waiting for build sandbox creation for ${owner}/${repo}/${postId}`
    )
  }

  const delay = BASE_RETRY_DELAY * 2 ** retryCount
  const jitter = Math.random() * delay * 0.1
  await sleep(delay + jitter)

  return getOrCreateBuildSandbox(gitContext, postId, retryCount + 1)
}

export const getWorkspace = async ({
  sandboxId,
  gitContext,
  mode = "ask",
  postId,
  userEmail,
  userName,
}: {
  sandboxId: string | null
  gitContext: GitContext
  mode?: AgentMode
  postId?: string
  userEmail?: string | null
  userName?: string | null
}): Promise<Workspace> => {
  let sandbox: Sandbox | null = null

  if (sandboxId) {
    sandbox = await tryRetrieveSandbox(sandboxId)
    if (sandbox) {
      await extendSandboxTimeout(
        sandbox,
        gitContext,
        mode === "build" ? postId : undefined
      )
    }
  }

  if (!sandbox) {
    if (mode === "build" && postId) {
      sandbox = await getOrCreateBuildSandbox(gitContext, postId)
    } else {
      sandbox = await getOrCreateSharedSandbox(gitContext)
    }
  }

  const repoUrl = `https://github.com/${gitContext.owner}/${gitContext.repo}.git`
  const providedRef = gitContext.ref

  if (mode === "build") {
    if (!(userEmail && userName)) {
      throw new Error("Build mode requires userEmail and userName")
    }
    return initializeBuildWorkspace({
      sandbox,
      gitContext,
      repoUrl,
      providedRef,
      userEmail,
      userName,
    })
  }

  return initializeAskWorkspace({ sandbox, gitContext, repoUrl, providedRef })
}

async function initializeAskWorkspace({
  sandbox,
  gitContext,
  repoUrl,
  providedRef,
}: {
  sandbox: Sandbox
  gitContext: GitContext
  repoUrl: string
  providedRef?: string
}): Promise<Workspace> {
  const repoDir = `${gitContext.repo}.git`
  const worktreesBase = `${gitContext.repo}-worktrees`

  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `
        set -e
        REPO_DIR="$1"
        REPO_URL="$2"
        WORKTREES_BASE="$3"
        PROVIDED_REF="$4"

        export PATH="$HOME/.local/bin:$PATH"

        # Install ripgrep in background if not present
        INSTALL_PID=""
        if ! which rg >/dev/null 2>&1; then
          (
            mkdir -p ~/.local/bin
            cd /tmp
            curl -sLO https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
            tar xzf ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
            cp -f ripgrep-15.1.0-x86_64-unknown-linux-musl/rg ~/.local/bin/ &&
            rm -rf ripgrep-15.1.0-x86_64-unknown-linux-musl*
          ) &
          INSTALL_PID=$!
        fi

        # Clone as bare repo if needed
        if [ ! -d "$REPO_DIR" ]; then
          git clone --bare "$REPO_URL" "$REPO_DIR"
        fi

        cd "$REPO_DIR"
        git fetch origin --quiet

        # Wait for tool installation to complete if it was started
        if [ -n "$INSTALL_PID" ]; then
          wait $INSTALL_PID || true
        fi

        # Determine ref: use provided or detect default branch
        if [ -n "$PROVIDED_REF" ]; then
          REF="$PROVIDED_REF"
        else
          # Get the default branch from the remote
          REF=$(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)
          if [ -z "$REF" ]; then
            echo "Error: Could not detect default branch from remote" >&2
            exit 1
          fi
        fi

        # Create worktree path - use short SHA (7 chars) for full SHAs, URL-encode otherwise
        if [[ "$REF" =~ ^[0-9a-f]{40}$ ]]; then
          WORKTREE_NAME=$(echo "$REF" | cut -c1-7)
        else
          WORKTREE_NAME=$(node -p 'encodeURIComponent(process.argv[1])' "$REF")
        fi
        WORKTREE_PATH="../$WORKTREES_BASE/$WORKTREE_NAME"
        ABS_WORKTREE_PATH=$(cd .. && pwd)/"$WORKTREES_BASE/$WORKTREE_NAME"

        # Clean up stale worktree entry if directory doesn't exist
        if git worktree list | grep -qF "$ABS_WORKTREE_PATH" && [ ! -d "$WORKTREE_PATH" ]; then
          git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || git worktree prune
        fi

        # Create or update worktree
        if [ ! -d "$WORKTREE_PATH" ]; then
          git worktree add "$WORKTREE_PATH" "$REF" >/dev/null 2>&1 || {
            echo "Error: Failed to create worktree for ref $REF" >&2
            exit 1
          }
        else
          (
            cd "$WORKTREE_PATH"
            git fetch origin >/dev/null 2>&1
            git reset --hard "origin/$REF" >/dev/null 2>&1 || git reset --hard "$REF" >/dev/null 2>&1
          )
        fi

        # Verify worktree was created
        if [ ! -d "$WORKTREE_PATH" ]; then
          echo "Error: Worktree directory does not exist after creation: $WORKTREE_PATH" >&2
          exit 1
        fi

        # Output worktree path on first line (absolute path)
        echo "$ABS_WORKTREE_PATH"

        # Gather git context and output as JSON on second line
        cd "$WORKTREE_PATH"
        SHA=$(git rev-parse HEAD)
        BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
        TAGS=$(git tag --points-at HEAD 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        MESSAGE=$(git log -1 --format="%s")
        DATE=$(git log -1 --format="%ci")

        node -p "JSON.stringify({
          sha: process.argv[1],
          branch: process.argv[2],
          tags: process.argv[3] ? process.argv[3].split(',') : [],
          message: process.argv[4],
          date: process.argv[5]
        })" "$SHA" "$BRANCH" "$TAGS" "$MESSAGE" "$DATE"
      `,
      "--",
      repoDir,
      repoUrl,
      worktreesBase,
      providedRef || "",
    ],
  })

  let stdout = ""
  let stderr = ""
  for await (const log of result.logs()) {
    if (log.stream === "stdout") {
      stdout += log.data
    } else {
      stderr += log.data
    }
  }

  if (stderr) {
    console.warn(`Workspace initialization warning: ${stderr}`)
  }

  const lines = stdout.trim().split("\n")
  const worktreePath = lines[0]?.replace(cleanupRegex, "")
  const gitContextJson = lines[1]?.trim()

  if (!(worktreePath && gitContextJson)) {
    console.error(
      `Invalid workspace output! stdout: "${stdout}", stderr: "${stderr}"`
    )
    throw new Error(
      `Failed to initialize git worktree. stderr: ${stderr || "none"}`
    )
  }

  let gitContextData: GitContextData
  try {
    gitContextData = JSON.parse(gitContextJson) as GitContextData
  } catch (error) {
    console.error(
      `Failed to parse git context JSON: ${error instanceof Error ? error.message : String(error)}, json: "${gitContextJson}"`
    )
    throw new Error("Failed to parse git context data")
  }

  return { path: worktreePath, sandbox, gitContextData }
}

async function initializeBuildWorkspace({
  sandbox,
  gitContext,
  repoUrl,
  providedRef,
  userEmail,
  userName,
}: {
  sandbox: Sandbox
  gitContext: GitContext
  repoUrl: string
  providedRef?: string
  userEmail: string
  userName: string
}): Promise<Workspace> {
  const repoDir = gitContext.repo

  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `
        set -e
        REPO_DIR="$1"
        REPO_URL="$2"
        PROVIDED_REF="$3"
        GIT_EMAIL="$4"
        GIT_NAME="$5"

        export PATH="$HOME/.local/bin:$PATH"

        # Install tools in background if not present
        INSTALL_PID=""
        if ! which rg >/dev/null 2>&1 || ! which gh >/dev/null 2>&1; then
          (
            mkdir -p ~/.local/bin
            cd /tmp

            # Install ripgrep
            if ! which rg >/dev/null 2>&1; then
              curl -sLO https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
              tar xzf ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
              cp -f ripgrep-15.1.0-x86_64-unknown-linux-musl/rg ~/.local/bin/ &&
              rm -rf ripgrep-15.1.0-x86_64-unknown-linux-musl*
            fi

            # Install GitHub CLI
            if ! which gh >/dev/null 2>&1; then
              curl -sLO https://github.com/cli/cli/releases/download/v2.62.0/gh_2.62.0_linux_amd64.tar.gz &&
              tar xzf gh_2.62.0_linux_amd64.tar.gz &&
              cp -f gh_2.62.0_linux_amd64/bin/gh ~/.local/bin/ &&
              rm -rf gh_2.62.0_linux_amd64*
            fi
          ) &
          INSTALL_PID=$!
        fi

        # Check if this is first initialization or a subsequent call
        FIRST_INIT=false
        if [ ! -d "$REPO_DIR" ]; then
          FIRST_INIT=true
          git clone --quiet "$REPO_URL" "$REPO_DIR" 2>&1
        fi

        cd "$REPO_DIR"

        # Configure git user identity (always, in case it changed)
        git config user.email "$GIT_EMAIL"
        git config user.name "$GIT_NAME"

        # Configure git credential helper to use GH_TOKEN at runtime
        # This reads from the environment when git needs credentials (set by Bash tool)
        git config credential.helper '!f() { test "$1" = get && echo "username=x-access-token" && echo "password=$GH_TOKEN"; }; f'

        # Wait for tool installation to complete if it was started
        if [ -n "$INSTALL_PID" ]; then
          wait $INSTALL_PID || true
        fi

        # Only checkout ref on first initialization
        # Subsequent calls should preserve agent's git state (branches, commits, etc.)
        if [ "$FIRST_INIT" = true ]; then
          git fetch origin --quiet 2>&1

          # Determine ref: use provided or detect default branch
          if [ -n "$PROVIDED_REF" ]; then
            REF="$PROVIDED_REF"
          else
            REF=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d' ' -f5)
            if [ -z "$REF" ]; then
              REF="main"
            fi
          fi

          # Checkout the ref (branch or SHA - agent handles branch creation from here)
          git checkout "$REF" >/dev/null 2>&1 || {
            echo "Error: Failed to checkout $REF" >&2
            exit 1
          }
        fi

        # Output path on first line
        ABS_PATH=$(pwd)
        echo "$ABS_PATH"

        # Gather git context and output as JSON on second line
        SHA=$(git rev-parse HEAD)
        BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
        TAGS=$(git tag --points-at HEAD 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        MESSAGE=$(git log -1 --format="%s")
        DATE=$(git log -1 --format="%ci")

        node -p "JSON.stringify({
          sha: process.argv[1],
          branch: process.argv[2],
          tags: process.argv[3] ? process.argv[3].split(',') : [],
          message: process.argv[4],
          date: process.argv[5]
        })" "$SHA" "$BRANCH" "$TAGS" "$MESSAGE" "$DATE"
      `,
      "--",
      repoDir,
      repoUrl,
      providedRef || "",
      userEmail,
      userName,
    ],
  })

  let stdout = ""
  let stderr = ""
  for await (const log of result.logs()) {
    if (log.stream === "stdout") {
      stdout += log.data
    } else {
      stderr += log.data
    }
  }

  const lines = stdout.trim().split("\n")
  const repoPath = lines[0]?.replace(cleanupRegex, "")
  const gitContextJson = lines.at(-1)?.trim()

  if (!(repoPath && gitContextJson?.startsWith("{"))) {
    console.error(
      `Invalid build workspace output! stdout: "${stdout}", stderr: "${stderr}"`
    )
    throw new Error("Failed to initialize build workspace")
  }

  let gitContextData: GitContextData
  try {
    gitContextData = JSON.parse(gitContextJson) as GitContextData
  } catch (error) {
    console.error(
      `Failed to parse git context JSON in build workspace: ${error instanceof Error ? error.message : String(error)}, json: "${gitContextJson}"`
    )
    throw new Error("Failed to parse git context data in build workspace")
  }

  return { path: repoPath, sandbox, gitContextData }
}
