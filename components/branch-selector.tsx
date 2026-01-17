"use client"

import { ChevronDownIcon, GitBranchIcon } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useEffect, useState } from "react"
import { BranchSelectorDialog } from "@/components/branch-selector-dialog"
import { searchBranchesAction } from "@/lib/actions/branches"
import { cn } from "@/lib/utils"

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
  const [selectedBranch, setSelectedBranch] = useQueryState(
    "branch",
    parseAsString.withDefault(defaultBranch)
  )
  const [branches, setBranches] = useState<string[]>([])
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)

  useEffect(() => {
    searchBranchesAction(owner, repo, "", 50)
      .then(setBranches)
      .catch((error) => {
        console.error("Failed to search branches:", error)
      })
  }, [owner, repo])

  const handleSelectBranch = (branch: string) => {
    setSelectedBranch(branch)
    onBranchChange?.(branch)
  }

  return (
    <>
      <button
        className={cn(
          "group flex h-9 cursor-pointer items-center gap-2 bg-transparent text-faint text-sm transition-none hover:text-accent active:text-accent sm:w-auto",
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
