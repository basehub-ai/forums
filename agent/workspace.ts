import { Sandbox } from "@vercel/sandbox"
import ms from "ms"
import { ResultAsync } from "neverthrow"
import {
  extendSandboxTTL,
  getOrLockSandbox,
  releaseSandboxLock,
  removeSandboxIf,
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
}

const cleanupRegex = /^\.\.\//

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
  gitContext: GitContext
): Promise<void> {
  await ResultAsync.fromPromise(
    sandbox.extendTimeout(timeout),
    (e) => e
  ).mapErr((err) => {
    console.error(`Failed to extend timeout for ${sandbox.sandboxId}:`, err)
    return err
  })

  await extendSandboxTTL(gitContext.owner, gitContext.repo, timeout)
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

export const getWorkspace = async ({
  sandboxId,
  gitContext,
}: {
  sandboxId: string | null
  gitContext: GitContext
}): Promise<Workspace> => {
  let sandbox: Sandbox | null = null

  if (sandboxId) {
    sandbox = await tryRetrieveSandbox(sandboxId)
    if (sandbox) {
      await extendSandboxTimeout(sandbox, gitContext)
    }
  }

  if (!sandbox) {
    sandbox = await getOrCreateSharedSandbox(gitContext)
  }
  const repoUrl = `https://github.com/${gitContext.owner}/${gitContext.repo}.git`
  const repoDir = `${gitContext.repo}.git` // Use .git suffix for bare repo
  const providedRef = gitContext.ref
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

        # Install ripgrep in background if not present
        if ! which rg >/dev/null 2>&1; then
          (
            mkdir -p ~/.local/bin &&
            cd /tmp &&
            curl -sLO https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
            tar xzf ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz &&
            cp -f ripgrep-15.1.0-x86_64-unknown-linux-musl/rg ~/.local/bin/ &&
            rm -rf ripgrep-15.1.0-x86_64-unknown-linux-musl*
          ) &
          RG_PID=$!
          export PATH="$HOME/.local/bin:$PATH"
        fi

        # Clone as bare repo if needed
        if [ ! -d "$REPO_DIR" ]; then
          git clone --bare "$REPO_URL" "$REPO_DIR"
        fi

        cd "$REPO_DIR"
        git fetch origin --quiet

        # Wait for ripgrep installation to complete if it was started
        if [ -n "$RG_PID" ]; then
          wait $RG_PID || true
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

        # Create worktree path with URL-encoded ref
        WORKTREE_NAME=$(node -p 'encodeURIComponent(process.argv[1])' "$REF")
        WORKTREE_PATH="../$WORKTREES_BASE/$WORKTREE_NAME"

        # Create or update worktree
        if [ ! -d "$WORKTREE_PATH" ]; then
          git worktree add "$WORKTREE_PATH" "$REF" >/dev/null 2>&1
        else
          cd "$WORKTREE_PATH"
          git fetch origin >/dev/null 2>&1
          git reset --hard "origin/$REF" >/dev/null 2>&1 || git reset --hard "$REF" >/dev/null 2>&1
        fi

        echo "$WORKTREE_PATH"
      `,
      "--",
      repoDir,
      repoUrl,
      worktreesBase,
      providedRef || "",
    ],
  })

  const stdout = await result.stdout()
  const stderr = await result.stderr()

  if (stderr) {
    console.error(`Git initialization stderr: ${stderr}`)
  }

  const worktreePath = stdout.trim().replace(cleanupRegex, "")

  if (!worktreePath) {
    console.error(
      `Empty worktree path! stdout: "${stdout}", stderr: "${stderr}"`
    )
    throw new Error("Failed to initialize git worktree")
  }

  return { path: worktreePath, sandbox }
}
