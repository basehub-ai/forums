"use client";
import type { Session, User } from "better-auth";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const UserDropdown = ({ user }: { user: User; session: Session }) => {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-visible:ring-ring flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2"
          type="button"
        >
          <img
            alt={user.name}
            className="size-8 rounded-full"
            src={user.image || ""}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img
            alt={user.name}
            className="size-8 rounded-full"
            src={user.image || ""}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
            router.refresh();
          }}
          variant="destructive"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
