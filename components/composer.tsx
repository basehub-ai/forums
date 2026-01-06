"use client"

import { useCustomer } from "autumn-js/react"
import { usePathname } from "next/navigation"
import { Suspense, useEffect, useRef, useState, useTransition } from "react"
import { Menu } from "@/components/ui/menu"
import { authClient } from "@/lib/auth-client"
import { Button } from "./button"

export type ComposerProps = {
  placeholder: string
  storageKey: string
  options: {
    asking: {
      id: string
      name: string
      image?: string | null
      isDefault?: boolean
      isPremium?: boolean
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
}: ComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const { check } = useCustomer()
  const isPro = check({ productId: "pro_plan" }).data.allowed
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
    }
  }, [storageKey])

  return (
    <form
      className="relative flex"
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
        className="no-focus min-h-composer-min-height w-full resize-none bg-shade/10 px-3 py-3 text-bright text-sm outline-dotted outline-2 outline-muted -outline-offset-1 focus:bg-shade/30 focus:outline-dashed"
        name="message"
        onChange={(e) => {
          const value = e.target.value
          if (value) {
            sessionStorage.setItem(storageKey, value)
          } else {
            sessionStorage.removeItem(storageKey)
          }
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

      <div className="pointer-events-none absolute bottom-0 left-0 flex w-full items-end justify-between px-3 py-3">
        <Suspense fallback={null}>
          <Menu.Root>
            <Menu.Trigger className="pointer-events-auto">
              {selectedAsking.name}
            </Menu.Trigger>
            <Menu.Popup>
              {options.asking.map((asking) => {
                const isDisabled = asking.isPremium && !isPro
                return (
                  <Menu.Item
                    disabled={isDisabled}
                    key={asking.id}
                    onClick={() => {
                      if (isDisabled) {
                        return
                      }
                      setSelectedAsking(asking)
                      onAskingChange?.(asking)
                    }}
                  >
                    {asking.isPremium && isPro
                      ? ` 💎 ${asking.name}`
                      : asking.name}
                    {asking.isPremium && !isPro && (
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
        <Button
          className="pointer-events-auto"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Posting..." : isSignedIn ? "Post" : "Log In"}
        </Button>
      </div>
    </form>
  )
}
