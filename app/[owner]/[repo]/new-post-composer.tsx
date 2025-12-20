"use client";

import { ArrowUpIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AskingSelector } from "@/components/asking-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/lib/actions/posts";
import { authClient } from "@/lib/auth-client";

type AskingOption = {
  id: string;
  name: string;
  image?: string | null;
  isDefault?: boolean;
};

export function NewPostComposer({
  owner,
  repo,
  askingOptions,
}: {
  owner: string;
  repo: string;
  askingOptions: AskingOption[];
}) {
  const { data: auth } = authClient.useSession();
  const isSignedIn = !!auth?.session;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [seekingAnswerFrom, setSeekingAnswerFrom] = useState<string | null>(
    null,
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSignedIn) {
      authClient.signIn.social({ provider: "github", callbackURL: pathname });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message")?.toString() || "";

    if (!message.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await createPost({
        owner,
        repo,
        content: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: message }],
        },
        seekingAnswerFrom,
      });

      formRef.current?.reset();
      router.push(`/${owner}/${repo}/${result.postNumber}`);
      router.refresh();
    });
  };

  return (
    <form
      className="bg-card rounded-lg border p-4"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <Textarea
        className="mb-3 min-h-[120px] resize-none"
        disabled={isPending}
        name="message"
        placeholder="Start a discussion..."
      />
      <div className="flex items-center justify-between">
        <AskingSelector
          disabled={isPending}
          onChange={setSeekingAnswerFrom}
          options={askingOptions}
          value={seekingAnswerFrom}
        />
        <Button disabled={isPending} size="sm" type="submit">
          <ArrowUpIcon className="mr-1 h-4 w-4" />
          {isPending ? "Creating..." : isSignedIn ? "Create post" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
