"use client"

import { ChevronRightIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { Collapsible } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export function CollapsibleItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible.Root className="w-full" onOpenChange={setOpen} open={open}>
      <Collapsible.Trigger className="group flex w-full cursor-pointer items-center gap-1 text-dim hover:text-bright">
        <ChevronRightIcon
          absoluteStrokeWidth
          className={cn("h-4 w-4 shrink-0 text-faint", open && "rotate-90")}
        />
        <span>{label}</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="mt-2 ml-5">{children}</Collapsible.Panel>
    </Collapsible.Root>
  )
}
