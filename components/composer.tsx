"use client"

import { useCustomer } from "autumn-js/react"
import { usePathname } from "next/navigation"
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"
import { Menu } from "@/components/ui/menu"
import { authClient } from "@/lib/auth-client"
import { useDialogStore } from "@/lib/stores/dialogs"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "./button"

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
    }[]
  }
  onSubmit: (params: {
    value: string
    options: {
      [K in keyof ComposerProps["options"]]: ComposerProps["options"][K][number]
    }
  }) => Promise<void>
  autoFocus?: boolean
  defaultAskingId?: string
  onAskingChange?: (asking: ComposerProps["options"]["asking"][number]) => void
  onChange?: (value: string) => void
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
}: ComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const setPaywallOpen = useDialogStore((s) => s.setPaywallOpen)
  const { customer, check } = useCustomer()
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
  }, [storageKey, adjustTextareaHeight])

  return (
    <form
      className="group flex flex-col bg-shade/10 outline-dotted outline-2 outline-muted -outline-offset-1 focus-within:bg-shade/30 focus-within:outline-dashed"
      onSubmit={(e) => {
        const form = e.currentTarget
        const value = form.message.value
        e.preventDefault()

        if (isSignedIn) {
          if (typeof value !== "string" || value.trim() === "") {
            console.error("Cannot submit empty message", value)
            return
          }
          startTransition(async () => {
            await onSubmit({ value, options: { asking: selectedAsking } })
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
        } else {
          startTransition(async () => {
            await authClient.signIn.social({
              provider: "github",
              callbackURL: pathname,
            })
          })
        }
      }}
    >
      <textarea
        autoFocus={autoFocus}
        className={cn(
          "no-focus min-h-20 w-full resize-none bg-transparent p-3 text-bright text-sm outline-none",
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
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        required
      />

      <div
        className={cn(
          "flex w-full items-end justify-between px-3 py-3",
          isScrollable &&
            "border-muted border-t-2 border-dotted group-focus-within:border-dashed"
        )}
      >
        <Suspense fallback={null}>
          <Menu.Root>
            <Menu.Trigger
              className={cn(
                buttonVariants({ variant: "tertiary" }),
                "hover:text-label hover:no-underline active:text-label data-popup-open:text-label"
              )}
            >
              {selectedAsking.name}
            </Menu.Trigger>
            <Menu.Popup>
              {options.asking.map((asking) => {
                const isDisabled = asking.isProModel && !isProUser
                return (
                  <Menu.Item
                    className={
                      isDisabled ? "cursor-not-allowed opacity-50" : undefined
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
                    {asking.name}
                    {asking.isProModel && (
                      <span className="ml-auto bg-faint px-1 py-0.5 font-medium text-label text-xxs uppercase">
                        PRO
                      </span>
                    )}
                  </Menu.Item>
                )
              })}
            </Menu.Popup>
          </Menu.Root>
        </Suspense>
        <div className="flex items-center gap-3">
          {isSignedIn &&
            selectedAsking.id !== "human" &&
            (() => {
              const requiredCredits = selectedAsking.isProModel ? 5 : 1
              const hasEnoughCredits = creditBalance >= requiredCredits
              if (!hasEnoughCredits) {
                if (creditBalance === 0) {
                  return (
                    <span className="text-red-500 text-xs">
                      You have run out of credits
                    </span>
                  )
                }
                return (
                  <span className="text-red-500 text-xs">
                    You have less than the required 5 credits to use this model
                  </span>
                )
              }
              return null
            })()}
          <Button
            className="cursor-pointer"
            disabled={
              isPending ||
              (isSignedIn &&
                selectedAsking.id !== "human" &&
                creditBalance < (selectedAsking.isProModel ? 5 : 1))
            }
            type="submit"
          >
            {isPending ? "Posting..." : isSignedIn ? "Post" : "Log In"}
          </Button>
        </div>
      </div>
    </form>
  )
}
