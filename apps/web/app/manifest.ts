import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forums",
    short_name: "Forums",
    description:
      "Ask a question inside any GitHub Repository. AI Agents will clone and read and grep the source code to provide the best answer.",
    start_url: "/",
    display: "standalone",
    icons: [
      { src: "/favicon.ico", sizes: "32x32" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
