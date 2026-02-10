"use client"

import { ChevronDownIcon, GitBranchIcon } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useState } from "react"
import { BranchSelectorDialog } from "@/components/branch-selector-dialog"
import { searchBranchesAction } from "@/lib/actions/branches"
import { cn } from "@/lib/utils"

const getStorageKey = (owner: string, repo: string) => `branch:${owner}/${repo}`

export type BranchSelectorProps = {
  defaultBranch: string
  owner: string
  repo: string
  onBranchChange?: (branch: string) => void
}

export function BranchSelector({
  defaultBranch,
  owner,
  repo,
  onBranchChange,
}: BranchSelectorProps) {
  const [branchParam, setBranchParam] = useQueryState("branch", parseAsString)
  const [branches, setBranches] = useState<string[]>([])
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    searchBranchesAction(owner, repo, "", 50)
      .then(setBranches)
      .catch((error) => {
        console.error("Failed to search branches:", error)
      })
  }, [owner, repo])

  // Resolve branch on initial load: URL param → localStorage → default
  useEffect(() => {
    if (branches.length === 0 || isInitialized) {
      return
    }

    const storageKey = getStorageKey(owner, repo)

    // If URL has a valid branch param, use it
    if (branchParam && branches.includes(branchParam)) {
      localStorage.setItem(storageKey, branchParam)
      setIsInitialized(true)
      return
    }

    // No URL param or invalid - try localStorage
    const savedBranch = localStorage.getItem(storageKey)
    if (savedBranch && branches.includes(savedBranch)) {
      setBranchParam(savedBranch)
      setIsInitialized(true)
      return
    }

    // Fallback to default
    setBranchParam(defaultBranch)
    localStorage.setItem(storageKey, defaultBranch)
    setIsInitialized(true)
  }, [
    branches,
    owner,
    repo,
    branchParam,
    defaultBranch,
    setBranchParam,
    isInitialized,
  ])

  const selectedBranch = branchParam ?? defaultBranch

  const handleSelectBranch = (branch: string) => {
    setBranchParam(branch)
    localStorage.setItem(getStorageKey(owner, repo), branch)
    onBranchChange?.(branch)
  }

  if (!isInitialized) {
    return
  }

  return (
    <>
      <button
        className={cn(
          "group flex h-9 animate-fade-in cursor-pointer items-center gap-2 bg-transparent font-pixel text-faint text-sm transition-none hover:text-accent active:text-accent sm:w-auto",
          isBranchDialogOpen && "text-accent"
        )}
        onClick={() => setIsBranchDialogOpen(true)}
        type="button"
      >
        <GitBranchIcon
          absoluteStrokeWidth
          aria-hidden="true"
          className="size-4 sm:hidden"
        />
        <span className="hidden max-w-24 truncate sm:block">
          {selectedBranch}
        </span>
        <ChevronDownIcon
          absoluteStrokeWidth
          aria-hidden="true"
          className={cn("size-4", isBranchDialogOpen && "rotate-180")}
        />
      </button>
      <BranchSelectorDialog
        defaultBranch={defaultBranch}
        initialBranches={branches}
        onOpenChange={setIsBranchDialogOpen}
        onSelectBranch={handleSelectBranch}
        open={isBranchDialogOpen}
        owner={owner}
        repo={repo}
        selectedBranch={selectedBranch}
      />
    </>
  )
}
