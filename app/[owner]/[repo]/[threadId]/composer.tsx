"use client"
import { ArrowUpIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { useAgentStore } from "./agent-store"

export const Composer = () => {
  const sendMessages = useAgentStore((state) => state.sendMessages)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const message = formData.get("message")?.toString() || ""
        sendMessages([{ parts: [{ type: "text", text: message }] }])
        e.currentTarget.reset()
      }}
    >
      <InputGroup>
        <InputGroupTextarea name="message" placeholder="Search or chat..." />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            className="rounded-full"
            size="icon-xs"
            variant="outline"
          >
            <PlusIcon />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="ghost">Auto</InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="[--radius:0.95rem]"
              side="top"
            >
              <DropdownMenuItem>Auto</DropdownMenuItem>
              <DropdownMenuItem>Agent</DropdownMenuItem>
              <DropdownMenuItem>Manual</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText className="ml-auto">52% used</InputGroupText>
          <Separator className="h-4!" orientation="vertical" />
          <InputGroupButton
            className="rounded-full"
            disabled
            size="icon-xs"
            variant="default"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <Button>New Thread</Button>
    </form>
  )
}
