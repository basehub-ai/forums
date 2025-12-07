import { Sandbox } from "@vercel/sandbox"
import ms from "ms"
import { ResultAsync } from "neverthrow"
import type { GitContext } from "."

const timeout = ms("10m")

export type Workspace = {
  path: string
  sandbox: Sandbox
}

const cleanupRegex = /^\.\.\//

export const getWorkspace = async ({
  sandboxId,
  gitContext,
}: {
  sandboxId: string | null
  gitContext: GitContext
}): Promise<Workspace> => {
  let sandbox: Sandbox | null = null
  if (sandboxId) {
    const existing = await ResultAsync.fromPromise(
      Sandbox.get({ sandboxId }),
      (e) => e
    ).mapErr((err) => {
      console.error(err)
      return err
    })

    if (existing.isOk()) {
      await ResultAsync.fromPromise(
        existing.value.extendTimeout(timeout),
        (e) => e
      ).mapErr((err) => {
        console.error(err)
        return err
      })
      sandbox = existing.value
    }
  }
  if (!sandbox) {
    const result = await ResultAsync.fromPromise(
      Sandbox.create({ resources: { vcpus: 2 }, timeout }),
      (e) => e
    ).mapErr((err) => {
      console.error(err)
      return err
    })
    if (result.isOk()) {
      sandbox = result.value
    } else {
      throw new Error("Failed to create sandbox")
    }
  }

  // Initialize git repo with worktrees (one worktree per ref, shared by multiple agents)
  const repoUrl = `https://github.com/${gitContext.owner}/${gitContext.repo}.git`
  const repoDir = gitContext.repo
  const providedRef = gitContext.ref
  const worktreesBase = `${repoDir}-worktrees`

  // Use a shell script to safely handle the ref (passed as arg to avoid injection)
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

        # Clone if needed
        if [ ! -d "$REPO_DIR/.git" ]; then
          git clone "$REPO_URL" "$REPO_DIR"
        fi

        cd "$REPO_DIR"
        git fetch origin

        # Determine ref: use provided or detect default branch
        if [ -n "$PROVIDED_REF" ]; then
          REF="$PROVIDED_REF"
        else
          REF=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
        fi

        # Create worktree path with URL-encoded ref
        WORKTREE_NAME=$(node -p 'encodeURIComponent(process.argv[1])' "$REF")
        WORKTREE_PATH="../$WORKTREES_BASE/$WORKTREE_NAME"

        # Create or update worktree
        if [ ! -d "$WORKTREE_PATH" ]; then
          git worktree add "$WORKTREE_PATH" "$REF"
        else
          cd "$WORKTREE_PATH"
          git fetch origin
          git reset --hard "origin/$REF" 2>/dev/null || git reset --hard "$REF"
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
  const worktreePath = stdout.trim().replace(cleanupRegex, "")

  return { path: worktreePath, sandbox }
}
