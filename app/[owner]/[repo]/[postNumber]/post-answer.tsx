import type { PostAnswer } from "@/agent/types"
import { cn } from "@/lib/utils"

export function PostAnswerBox({ answer }: { answer: PostAnswer }) {
  if (answer.type !== "answer") {
    return null
  }

  return (
    <div
      className={cn(
        "relative border-2 border-green-600/40 bg-green-950/20 p-4",
        "before:absolute before:top-0 before:left-0 before:h-full before:w-1 before:bg-green-500"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-semibold text-green-400 text-sm uppercase tracking-wide">
          Answer
        </span>
      </div>
      <div className="prose prose-sm prose-invert max-w-none text-foreground">
        {answer.text}
      </div>
    </div>
  )
}
