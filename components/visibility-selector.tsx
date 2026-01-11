"use client"

import { GlobeIcon, LockIcon } from "lucide-react"
import { Menu } from "@/components/ui/menu"
import { cn } from "@/lib/utils"

export type Visibility = "public" | "private"

type VisibilitySelectorProps = {
  value: Visibility
  onChange: (value: Visibility) => void
  disabled?: boolean
}

const options: { value: Visibility; label: string; icon: typeof GlobeIcon }[] =
  [
    { value: "public", label: "Public", icon: GlobeIcon },
    { value: "private", label: "Private", icon: LockIcon },
  ]

export function VisibilitySelector({
  value,
  onChange,
  disabled,
}: VisibilitySelectorProps) {
  const selected = options.find((o) => o.value === value) ?? options[0]
  const Icon = selected.icon

  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 px-2 py-1.5 text-faint text-sm opacity-50">
        <Icon className="size-3.5" />
        {selected.label}
      </span>
    )
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 px-2 py-1.5 text-muted text-sm transition-colors",
          "hover:text-bright data-popup-open:text-bright"
        )}
      >
        <Icon className="size-3.5" />
        {selected.label}
      </Menu.Trigger>
      <Menu.Popup>
        {options.map((option) => {
          const OptionIcon = option.icon
          return (
            <Menu.Item key={option.value} onClick={() => onChange(option.value)}>
              <OptionIcon className="size-3.5" />
              {option.label}
            </Menu.Item>
          )
        })}
      </Menu.Popup>
    </Menu.Root>
  )
}
