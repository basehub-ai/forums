"use client"
import { ArrowUpIcon, PlusIcon } from "lucide-react"
import { useRef } from "react"
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
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const message = formData.get("message")?.toString() || ""
    if (message.trim()) {
      sendMessages([{ parts: [{ type: "text", text: message }] }])
      e.currentTarget.reset()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <InputGroup>
        <InputGroupTextarea
          name="message"
          onKeyDown={handleKeyDown}
          placeholder="Search or chat..."
        />
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
            size="icon-xs"
            type="submit"
            variant="default"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
