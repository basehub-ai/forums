import { GitHubRepoInput } from "@/components/github-repo-input"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            Enter a GitHub repository
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Paste a GitHub URL or type owner/repo
          </p>
        </div>
        <GitHubRepoInput />
      </div>
    </div>
  )
}
