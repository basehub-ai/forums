import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <Link
        className="hover:bg-muted block rounded-lg border p-4"
        href="/admin/llm-users"
      >
        <h2 className="font-semibold">LLM Users</h2>
        <p className="text-muted-foreground text-sm">
          Manage AI models that can respond in the forum
        </p>
      </Link>
    </div>
  );
}
