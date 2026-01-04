"use client"
import { Combobox } from "@base-ui-components/react/combobox"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
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
    }[]
  }
  onSubmit: (params: {
    value: string
    options: {
      [K in keyof ComposerProps["options"]]: ComposerProps["options"][K][number]
    }
  }) => Promise<void>
  autoFocus?: boolean
}

type AskingOption = ComposerProps["options"]["asking"][number]

export const Composer = ({
  placeholder,
  onSubmit,
  storageKey,
  options,
  autoFocus,
}: ComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { data: auth } = authClient.useSession()
  const isSignedIn = !!auth?.session
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const [selectedAsking, setSelectedAsking] = useState<AskingOption>(
    () => options.asking.find((a) => a.isDefault) ?? options.asking[0]
  )

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
        className="no-focus min-h-composer-min-height w-full resize-none bg-shade/10 px-3 py-3 text-bright text-sm outline-dashed outline-2 outline-muted -outline-offset-1 focus:bg-shade/30 focus:outline-solid"
        name="message"
        onChange={(e) => {
          const value = e.target.value
          if (value) {
            sessionStorage.setItem(storageKey, value)
          } else {
            sessionStorage.removeItem(storageKey)
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        required
      />

      <div className="pointer-events-none absolute bottom-0 left-0 flex w-full items-end justify-between px-3 py-3">
        <Combobox.Root
          items={options.asking.map((a) => a.name)}
          onValueChange={(name) => {
            const asking = options.asking.find((a) => a.name === name)
            if (asking) {
              setSelectedAsking(asking)
            }
          }}
          value={selectedAsking.name}
        >
          <Combobox.Input
            className="pointer-events-auto text-sm"
            onFocus={(e) => e.target.select()}
          />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  {(name) => (
                    <Combobox.Item className="text-sm" key={name} value={name}>
                      {name}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
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
