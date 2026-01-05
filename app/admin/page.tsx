import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import { List, ListItem, Subtitle } from "@/components/typography"

export default function AdminPage() {
  return (
    <List>
      <ListItem>
        <Link
          className="group flex grow items-start gap-1"
          href="/admin/llm-users"
        >
          <AsteriskIcon className="mt-0.5 shrink-0 text-faint" size={16} />
          <div>
            <span className="text-dim group-hover:text-bright group-hover:underline">
              LLM Users
            </span>
            <Subtitle className="text-faint text-sm">
              Manage AI models that can respond in the forum
            </Subtitle>
          </div>
        </Link>
      </ListItem>
    </List>
  )
}
