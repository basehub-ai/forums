"use client";

import { usePostMetadata } from "./post-metadata-context";

type Participant = {
  id: string;
  name: string;
  image: string | null;
};

export function PostSidebar({ participants }: { participants: Participant[] }) {
  const { category } = usePostMetadata();

  return (
    <aside className="w-64 shrink-0 space-y-6">
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
          Category
        </h3>
        {category ? (
          <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
            <span className="text-lg">{category.emoji || "?"}</span>
            <span className="text-sm font-medium">{category.title}</span>
          </div>
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
    </aside>
  );
}
