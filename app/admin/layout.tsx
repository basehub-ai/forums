import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { auth, isAdmin } from "@/lib/auth";

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!isAdmin(session?.user)) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>
      {children}
    </div>
  );
}
