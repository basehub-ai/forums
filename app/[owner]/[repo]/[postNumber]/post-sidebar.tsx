"use client";

import { CommitIcon } from "@radix-ui/react-icons";
import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePostMetadata } from "./post-metadata-context";

type Participant = {
  id: string;
  name: string;
  image: string | null;
};

export function PostSidebar({ participants }: { participants: Participant[] }) {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { category } = usePostMetadata();

  return (
    <aside className="w-64 shrink-0 space-y-4">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          {participants.length} participant
          {participants.length !== 1 ? "s" : ""}
        </h3>
        <div className="flex flex-wrap gap-1">
          {participants.map((p, i) => (
            <img
              alt={p.name}
              className="h-8 w-8 rounded-lg"
              // biome-ignore lint/suspicious/noArrayIndexKey: They are effectively the same
              key={p.id + i}
              src={
                p.image ??
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`
              }
              title={p.name}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Categories
        </h3>
        {category ? (
          <Link
            href={`/${owner}/${repo}/category/${category.id}`}
            className="bg-card text-card-foreground flex w-fit items-center gap-2 rounded-full border px-3.5 py-0.5"
          >
            <span className="text-lg">{category.emoji || "?"}</span>
            <span className="text-sm font-medium">{category.title}</span>
          </Link>
        ) : (
          <div className="bg-muted relative overflow-hidden rounded-lg px-3 py-2">
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-lg">?</span>
              <span className="text-sm font-medium">Generating...</span>
            </div>
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center gap-1">
          <GitBranchIcon className="size-4" />
          <span className="text-sm font-medium">main</span>
        </div>

        <div className="text-muted-foreground flex items-center gap-1">
          <CommitIcon className="size-4" />
          <span className="text-sm font-medium">d8af6b2</span>
        </div>
      </div>
    </aside>
  );
}
