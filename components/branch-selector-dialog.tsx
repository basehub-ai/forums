"use client"

import { SearchIcon } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { Dialog } from "@/components/ui/dialog"
import { searchBranchesAction } from "@/lib/actions/branches"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { cn } from "@/lib/utils"

type BranchSelectorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner: string
  repo: string
  selectedBranch: string
  defaultBranch: string
  onSelectBranch: (branch: string) => void
  initialBranches: string[]
}

export function BranchSelectorDialog({
  open,
  onOpenChange,
  owner,
  repo,
  selectedBranch,
  defaultBranch,
  onSelectBranch,
  initialBranches,
}: BranchSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [branches, setBranches] = useState<string[]>(initialBranches)
  const [isPending, startTransition] = useTransition()
  const debouncedQuery = useDebounce(searchQuery, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBranches(initialBranches)
  }, [initialBranches])

  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setBranches(initialBranches)
      return
    }

    if (debouncedQuery === "") {
      setBranches(initialBranches)
      return
    }

    startTransition(async () => {
      await searchBranchesAction(owner, repo, debouncedQuery)
        .then(setBranches)
        .catch((error) => {
          console.error("Failed to search branches:", error)
        })
    })
  }, [open, owner, repo, debouncedQuery, initialBranches])

  function handleSelect(branch: string) {
    onSelectBranch(branch)
    onOpenChange(false)
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup initialFocus={inputRef} title="Select branch">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <SearchIcon
                absoluteStrokeWidth
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
              />
              <input
                className="w-full border border-dim bg-transparent py-2 pr-3 pl-10 text-sm outline-none placeholder:text-faint focus:border-accent"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches…"
                ref={inputRef}
                type="text"
                value={searchQuery}
              />
            </div>

            <div className="h-52 overflow-y-auto" role="listbox">
              {isPending ? (
                <div className="flex h-full items-center justify-center">
                  <span className="text-faint text-sm">Searching…</span>
                </div>
              ) : branches.length > 0 ? (
                <div className="flex flex-col">
                  {branches
                    .toSorted((a, b) => {
                      if (a === defaultBranch) {
                        return -1
                      }
                      if (b === defaultBranch) {
                        return 1
                      }
                      const commonBranches = [
                        "main",
                        "master",
                        "dev",
                        "develop",
                        "canary",
                        "staging",
                        "production",
                      ]
                      const aIndex = commonBranches.indexOf(a)
                      const bIndex = commonBranches.indexOf(b)
                      if (aIndex !== -1 && bIndex === -1) {
                        return -1
                      }
                      if (aIndex === -1 && bIndex !== -1) {
                        return 1
                      }
                      if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex
                      }
                      return a.localeCompare(b)
                    })
                    .map((branch) => (
                      <button
                        aria-selected={branch === selectedBranch}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-shade hover:text-bright focus:bg-shade focus:text-bright",
                          branch === selectedBranch
                            ? "text-accent hover:text-accent"
                            : "text-muted"
                        )}
                        key={branch}
                        onClick={() => handleSelect(branch)}
                        role="option"
                        type="button"
                      >
                        <span className="break-all">{branch}</span>
                        {branch === defaultBranch && (
                          <span className="shrink-0 text-faint text-xs">
                            default
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-faint text-sm">
                  No branches found
                </div>
              )}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
