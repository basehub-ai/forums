import type { NextConfig } from "next"
import { withWorkflow } from "workflow/next"

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default withWorkflow(nextConfig)
