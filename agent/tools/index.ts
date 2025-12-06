import type { ToolSet } from "ai"
import { z } from "zod"
import { checkTimeStep } from "./check-time"

export function getTools(): ToolSet {
  return {
    checkTime: {
      name: "checkTime",
      description: "Check the current time",
      inputSchema: z.object({}),
      execute: async () => await checkTimeStep(),
    },
  }
}
