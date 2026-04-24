"use client"

import { useCustomer } from "autumn-js/react"
import { AlertTriangleIcon, ChevronDownIcon } from "lucide-react"
import { Tooltip } from "@/components/ui/tooltip"
import { usePathname } from "next/navigation"
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import type { AgentMode } from "@/agent/types"
import { BranchSelector } from "@/components/branch-selector"
import ClaudeIcon from "@/components/icons/claude"
import GeminiIcon from "@/components/icons/gemini"
import OpenAIIcon from "@/components/icons/openai"
import { Menu } from "@/components/ui/menu"
import { authClient } from "@/lib/auth-client"
import { useAutoFocusOnType } from "@/lib/hooks/use-auto-focus-on-type"
import { useDialogStore } from "@/lib/stores/dialogs"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const PREFERRED_MODE_KEY = "preferred-mode"

function getModelIcon(provider?: string) {
  switch (provider?.toLowerCase()) {
    case "anthropic":
      return ClaudeIcon
    case "google":
      return GeminiIcon
    case "openai":
      return OpenAIIcon
    default:
      return null
  }
}

export type ComposerProps = {
  placeholder: string
  storageKey: string
  options: {
    asking: {
      id: string
      name: string
      image?: string | null
      isDefault?: boolean
      isProModel?: boolean
      provider?: string
    }[]
  }
  onSubmit: (params: {
    value: string
    options: {
      [K in keyof ComposerProps["options"]]: ComposerProps["options"][K][number]
    }
    branch?: string
    mode?: AgentMode
  }) => Promise<void>
  autoFocus?: boolean
  defaultAskingId?: string
  onAskingChange?: (asking: ComposerProps["options"]["asking"][number]) => void
  onChange?: (value: string) => void
  defaultBranch?: string
  owner?: string
  repo?: string
  canModerate?: boolean
  hasRepoScope?: boolean
  onRequestRepoScope?: () => void
  isStreaming?: boolean
  defaultMode?: AgentMode
}

type AskingOption = ComposerProps["options"]["asking"][number]

export const Composer = ({
  placeholder,
  onSubmit,
  storageKey,
  options,
  autoFocus,
  defaultAskingId,
  onAskingChange,
  onChange,
  defaultBranch,
  owner,
  repo,
  canModerate,
  hasRepoScope,
  onRequestRepoScope,
  isStreaming,
  defaultMode,
}: ComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { data: auth, isPending: isAuthLoading } = authClient.useSession()
  const isSignedIn = !!auth?.session?.userId && !isAuthLoading
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const setPaywallOpen = useDialogStore((s) => s.setPaywallOpen)
  const { customer, check, isLoading: isCustomerLoading } = useCustomer()
  const isProUser = check({ productId: "pro_plan" }).data.allowed
  const creditBalance = customer?.features?.standard_credits?.balance ?? 0
  const [selectedAsking, setSelectedAsking] = useState<AskingOption>(() => {
    if (defaultAskingId) {
      const found = options.asking.find((a) => a.id === defaultAskingId)
      if (found) {
        return found
      }
    }
    return options.asking.find((a) => a.isDefault) ?? options.asking[0]
  })
  const [defaultAskingIdSet, setDefaultAskingIdSet] = useState(false)
  const [isScrollable, setIsScrollable] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const selectedBranchRef = useRef(defaultBranch ?? "main")
  const [mode, setMode] = useState<AgentMode>("ask")

  useEffect(() => {
    if (canModerate) {
      // Priority: defaultMode (from previous comment) > sessionStorage > "ask"
      if (defaultMode === "build" || defaultMode === "ask") {
        setMode(defaultMode)
        return
      }
      const saved = sessionStorage.getItem(PREFERRED_MODE_KEY)
      if (saved === "build" || saved === "ask") {
        setMode(saved)
      }
    }
  }, [canModerate, defaultMode])

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "ask" ? "build" : "ask"
      sessionStorage.setItem(PREFERRED_MODE_KEY, next)
      return next
    })
  }, [])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    const maxHeight = 264 - 48 // 264px total max - ~48px footer
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`

    setIsScrollable(textarea.scrollHeight > maxHeight)
  }, [])

  useEffect(() => {
    if (defaultAskingId && !defaultAskingIdSet) {
      const found = options.asking.find((a) => a.id === defaultAskingId)
      if (found) {
        setSelectedAsking(found)
        setDefaultAskingIdSet(true)
      }
    }
  }, [defaultAskingId, defaultAskingIdSet, options.asking])

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey)
    if (saved && textareaRef.current) {
      textareaRef.current.value = saved
      adjustTextareaHeight()
    }
    onChange?.(saved || "")
  }, [storageKey, adjustTextareaHeight, onChange])

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus])

  useAutoFocusOnType(textareaRef)

  return (
    <form
      className={cn(
        "group flex flex-col bg-shade/10 outline-dotted outline-2 outline-muted -outline-offset-1 focus-within:bg-shade/30 focus-within:outline-dashed",
        isMenuOpen && "bg-shade/30 outline-dashed"
      )}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const value = form.message.value
        if (typeof value !== "string" || value.trim() === "") {
          console.error("Cannot submit empty message", value)
          return
        }
        startTransition(async () => {
          await onSubmit({
            value,
            options: { asking: selectedAsking },
            branch: selectedBranchRef.current,
            mode: canModerate ? mode : undefined,
          })
            .then(() => {
              form.reset()
              sessionStorage.removeItem(storageKey)
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto"
              }
              setIsScrollable(false)
            })
            .catch((e) => {
              console.error(e)
            })
        })
      }}
    >
      <textarea
        aria-label="Message"
        autoFocus={autoFocus}
        className={cn(
          "no-focus min-h-27 w-full resize-none bg-transparent p-3 text-base text-dim outline-none placeholder:text-faint sm:min-h-20 sm:text-sm",
          isScrollable && "scroll-pb-3"
        )}
        name="message"
        onChange={(e) => {
          const value = e.target.value
          if (value) {
            sessionStorage.setItem(storageKey, value)
          } else {
            sessionStorage.removeItem(storageKey)
          }
          adjustTextareaHeight()
          onChange?.(value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab" && e.shiftKey && canModerate) {
            e.preventDefault()
            toggleMode()
            return
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            if (isStreaming) {
              return
            }
            if (isSignedIn) {
              e.currentTarget.form?.requestSubmit()
            } else {
              startTransition(async () => {
                await authClient.signIn.social({
                  provider: "github",
                  callbackURL: pathname,
                })
              })
            }
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        required
      />

      {isAuthLoading || isCustomerLoading ? (
        // biome-ignore lint/a11y/useKeyWithClickEvents: focus-forwarding UX
        // biome-ignore lint/a11y/noStaticElementInteractions: focus-forwarding UX
        <div
          className="h-27 cursor-text sm:h-15"
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest("button")) {
              return
            }
            textareaRef.current?.focus()
          }}
        />
      ) : (
        // biome-ignore lint/a11y/useKeyWithClickEvents: focus-forwarding UX
        // biome-ignore lint/a11y/noStaticElementInteractions: focus-forwarding UX
        <div
          className={cn(
            "flex w-full animate-fade-in cursor-text flex-col gap-2 px-3 py-3",
            isScrollable &&
              "border-muted border-t-2 border-dotted group-focus-within:border-dashed"
          )}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.closest("button")) {
              return
            }
            textareaRef.current?.focus()
          }}
        >
          <div className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Menu.Root onOpenChange={setIsMenuOpen}>
                <Menu.Trigger
                  className={cn(
                    "group h-9 justify-between bg-transparent text-faint text-sm transition-none hover:text-accent hover:no-underline active:text-accent data-popup-open:text-accent sm:w-auto"
                  )}
                >
                  {(() => {
                    const Icon = getModelIcon(selectedAsking.provider)
                    return Icon ? (
                      <Icon aria-hidden="true" className="size-4" />
                    ) : null
                  })()}
                  <span className="hidden truncate sm:block">
                    {selectedAsking.name}
                  </span>
                  <ChevronDownIcon
                    absoluteStrokeWidth
                    aria-hidden="true"
                    className="size-4 group-data-popup-open:rotate-180"
                  />
                </Menu.Trigger>
                <Menu.Popup className="">
                  {options.asking.map((asking) => {
                    const isDisabled = asking.isProModel && !isProUser
                    return (
                      <Menu.Item
                        className={
                          isDisabled
                            ? "cursor-not-allowed opacity-50"
                            : undefined
                        }
                        key={asking.id}
                        onClick={() => {
                          if (isDisabled) {
                            setPaywallOpen(true)
                            return
                          }
                          setSelectedAsking(asking)
                          onAskingChange?.(asking)
                        }}
                      >
                        {(() => {
                          const Icon = getModelIcon(asking.provider)
                          return Icon ? (
                            <Icon aria-hidden="true" className="size-4" />
                          ) : null
                        })()}
                        {asking.name}
                        {asking.isProModel && (
                          <span className="bg-accent/10 px-1.5 py-0.5 font-medium text-accent text-xxs">
                            PRO
                          </span>
                        )}
                      </Menu.Item>
                    )
                  })}
                </Menu.Popup>
              </Menu.Root>

              {owner && repo && (
                <Suspense>
                  <BranchSelector
                    defaultBranch={defaultBranch ?? "main"}
                    onBranchChange={(branch) => {
                      selectedBranchRef.current = branch
                    }}
                    owner={owner}
                    repo={repo}
                  />
                </Suspense>
              )}

              {isSignedIn && selectedAsking.id !== "human" && (
                <CreditWarning
                  className="hidden sm:block"
                  creditBalance={creditBalance}
                  selectedAsking={selectedAsking}
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              {canModerate && (
                <div className="flex items-center gap-2">
                  <Tooltip.Provider>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        aria-label={
                          mode === "ask"
                            ? "Switch to build mode"
                            : "Switch to ask mode"
                        }
                        className={cn(
                          "flex items-center justify-center gap-1 text-faint text-sm transition-colors hover:text-accent"
                        )}
                        onClick={toggleMode}
                        type="button"
                      >
                        {mode}
                      </Tooltip.Trigger>
                      <Tooltip.Popup>
                        {mode === "ask"
                          ? "Switch to build mode (Shift+Tab)"
                          : "Switch to ask mode (Shift+Tab)"}
                      </Tooltip.Popup>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  {mode === "build" && !hasRepoScope && (
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          aria-label="Grant additional GitHub permissions for build mode"
                          className="flex items-center justify-center text-yellow-500 transition-colors hover:text-yellow-400"
                          onClick={onRequestRepoScope}
                        >
                          <AlertTriangleIcon className="size-4" />
                        </Tooltip.Trigger>
                        <Tooltip.Popup>
                          Build mode requires additional GitHub permissions.
                          Click to grant access.
                        </Tooltip.Popup>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  )}
                </div>
              )}
              <Button
                className="cursor-pointer"
                disabled={
                  isPending ||
                  isStreaming ||
                  (mode === "build" && !hasRepoScope) ||
                  (isSignedIn &&
                    selectedAsking.id !== "human" &&
                    creditBalance < (selectedAsking.isProModel ? 5 : 1))
                }
                onClick={
                  isSignedIn
                    ? undefined
                    : () => {
                        startTransition(async () => {
                          await authClient.signIn.social({
                            provider: "github",
                            callbackURL: pathname,
                          })
                        })
                      }
                }
                type={isSignedIn ? "submit" : "button"}
              >
                {isSignedIn
                  ? isPending
                    ? "Posting…"
                    : "Post"
                  : isPending
                    ? "Logging in…"
                    : "Log In"}
              </Button>
            </div>
          </div>

          {isSignedIn && selectedAsking.id !== "human" && (
            <CreditWarning
              className="w-full text-center sm:hidden"
              creditBalance={creditBalance}
              selectedAsking={selectedAsking}
            />
          )}
        </div>
      )}
    </form>
  )
}

const CreditWarning = ({
  selectedAsking,
  creditBalance,
  className,
}: {
  selectedAsking: AskingOption
  creditBalance: number
  className?: string
}) => {
  const requiredCredits = selectedAsking.isProModel ? 5 : 1
  const hasEnoughCredits = creditBalance >= requiredCredits
  if (!hasEnoughCredits) {
    if (creditBalance === 0) {
      return (
        <span className={cn("text-red-500 text-xs", className)}>
          Out of credits
        </span>
      )
    }
    return (
      <span className={cn("text-red-500 text-xs", className)}>
        Not enough credits for this model
      </span>
    )
  }
  return null
}
