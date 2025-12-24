"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckIcon, Link2Icon } from "@radix-ui/react-icons";
import { useState } from "react";

export function CopyLinkButton({
  owner,
  repo,
  postNumber,
  commentNumber,
}: {
  owner: string;
  repo: string;
  postNumber: string;
  commentNumber: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const Icon = isCopied ? CheckIcon : Link2Icon;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${owner}/${repo}/${postNumber}#${commentNumber}`,
    );
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="text-muted-foreground transition-instant-hover text-xs opacity-0 group-hover:opacity-100"
            onClick={copyToClipboard}
          >
            <Icon className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isCopied ? "Copied" : "Copy link to this comment"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
