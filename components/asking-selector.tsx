"use client"

import { Menu } from "@base-ui/react/menu"
import { ChevronDownIcon } from "lucide-react"

type Option = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function AskingSelector({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const defaultOption = options.find((o) => o.isDefault)
  const selectedOption = value
    ? options.find((o) => o.id === value)
    : defaultOption

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Asking:</span>
      <Menu.Root>
        <Menu.Trigger disabled={disabled}>
          {selectedOption?.image ? (
            <img
              alt=""
              className="h-4 w-4 rounded-full"
              height={16}
              src={selectedOption.image}
              width={16}
            />
          ) : null}
          {selectedOption?.name ?? "Select"}
          <ChevronDownIcon className="h-3 w-3 opacity-50" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start">
            <Menu.Popup>
              {options.map((option) => (
                <Menu.Item
                  key={option.id}
                  onClick={() => onChange(option.id)}
                >
                  {option.image ? (
                    <img
                      alt=""
                      className="h-4 w-4 rounded-full"
                      height={16}
                      src={option.image}
                      width={16}
                    />
                  ) : null}
                  {option.name}
                  {option.isDefault ? (
                    <span className="text-muted-foreground text-xs">(default)</span>
                  ) : null}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
