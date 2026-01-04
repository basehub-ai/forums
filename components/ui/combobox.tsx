"use client"

import { Combobox as BaseCombobox } from "@base-ui-components/react/combobox"
import { cn } from "@/lib/utils"

const Root = BaseCombobox.Root

function Input({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Input>) {
  return (
    <BaseCombobox.Input
      className={cn(
        "border-none bg-transparent text-dim text-sm outline-none",
        "placeholder:text-faint focus:text-bright",
        className
      )}
      {...props}
    />
  )
}

function Popup({
  className,
  sideOffset = 4,
  align = "start",
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Popup> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
}) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner align={align} sideOffset={sideOffset}>
        <BaseCombobox.Popup
          className={cn(
            "z-50 min-w-[160px] max-h-[240px] overflow-y-auto border border-border-solid bg-background p-1 text-sm shadow-md",
            "origin-[var(--transform-origin)] transition-[opacity,transform] duration-150",
            "data-[open]:opacity-100 data-[open]:scale-100 data-[open]:translate-y-0",
            "data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-1 data-[closed]:pointer-events-none",
            className
          )}
          {...props}
        >
          {children}
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  )
}

const List = BaseCombobox.List

function Item({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Item>) {
  return (
    <BaseCombobox.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-dim outline-none transition-colors",
        "data-[highlighted]:bg-shade data-[highlighted]:text-bright",
        "data-[selected]:font-medium data-[selected]:text-bright",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export const Combobox = {
  Root,
  Input,
  Popup,
  List,
  Item,
}
