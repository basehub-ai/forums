"use client"

import { ArrowRightIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

const githubUrlRegex =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/(?:pull|tree|commit)\/([^/?#]+))?/i
const simpleRegex = /^([^/]+)\/([^/]+)$/
const gitSuffix = /\.git$/i

export function GitHubRepoInput() {
  const [input, setInput] = useState("")
  const router = useRouter()

  const parseGitHubUrl = (
    value: string
  ): { owner: string; repo: string; ref?: string } | null => {
    // Remove whitespace
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    // GitHub URL patterns to match:
    // - https://github.com/owner/repo
    // - github.com/owner/repo
    // - owner/repo
    // - https://github.com/owner/repo/pull/123
    // - https://github.com/owner/repo/tree/branch-name
    // - https://github.com/owner/repo/commit/sha

    const urlMatch = trimmed.match(githubUrlRegex)
    if (urlMatch) {
      const [, owner, repo, ref] = urlMatch
      // Clean up repo name (remove .git suffix if present)
      const cleanRepo = repo.replace(gitSuffix, "")
      return { owner, repo: cleanRepo, ref }
    }

    const simpleMatch = trimmed.match(simpleRegex)
    if (simpleMatch) {
      const [, owner, repo] = simpleMatch
      return { owner, repo: repo.replace(gitSuffix, "") }
    }

    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseGitHubUrl(input)
    if (!parsed) {
      return
    }

    const { owner, repo, ref } = parsed
    const url = ref ? `/${owner}/${repo}?ref=${ref}` : `/${owner}/${repo}`
    router.push(url)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    // If user pastes a full GitHub URL, extract the owner/repo part
    if (value.includes("github.com/")) {
      const parsed = parseGitHubUrl(value)
      if (parsed) {
        // Show just owner/repo in the input, we'll preserve ref on submit
        value = `${parsed.owner}/${parsed.repo}`
      }
    }

    setInput(value)
  }

  return (
    <form className="w-full max-w-md" onSubmit={handleSubmit}>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText className="text-foreground">
            https://github.com/
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          className="pl-0.5! font-mono"
          onChange={handleInputChange}
          placeholder="owner/repo"
          type="text"
          value={input}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton disabled={!input.trim()} type="submit">
            <ArrowRightIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
