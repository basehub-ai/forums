import { RepoPermissionsProvider } from "./repo-permissions-context"

export default async function RepoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params

  return (
    <RepoPermissionsProvider owner={owner} repo={repo}>
      {children}
    </RepoPermissionsProvider>
  )
}
