"use client"

import { cn } from "@/lib/utils"
import { DotsBackground } from "./ui/dots-shadow"

type FlowStep = {
  title: string
  status?: "pending" | "active" | "complete"
}

type FlowDiagramProps = {
  steps: FlowStep[]
  className?: string
}

function FlowBox({ step }: { step: FlowStep }) {
  return (
    <div
      className={cn(
        "relative flex min-w-32 flex-col items-center justify-center border border-dim bg-background px-3 py-2 text-center"
      )}
    >
      <span className="text-balance text-dim text-xs">{step.title}</span>
    </div>
  )
}

function Connector({ direction }: { direction: "horizontal" | "vertical" }) {
  if (direction === "horizontal") {
    return (
      <span aria-hidden="true" className="px-1 text-dim text-xs">
        ──▶
      </span>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center bg-background py-1 text-muted text-xs"
    >
      <span>│</span>
      <span>▼</span>
    </div>
  )
}

export function FlowDiagram({ steps, className }: FlowDiagramProps) {
  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      <div className="relative w-full p-8">
        <DotsBackground />

        <div className="relative z-10 flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3">
          {steps.map((step, i) => (
            <div
              className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3"
              key={step.title}
            >
              <FlowBox step={step} />
              {i < steps.length - 1 && (
                <>
                  <span className="sm:hidden">
                    <Connector direction="vertical" />
                  </span>
                  <span className="hidden sm:inline">
                    <Connector direction="horizontal" />
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { FlowStep }
