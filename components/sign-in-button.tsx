"use client";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export const SignInButton = () => {
  const pathname = usePathname();
  return (
    <Button
      onClick={() =>
        authClient.signIn.social({ provider: "github", callbackURL: pathname })
      }
    >
      Sign in with GitHub
    </Button>
  );
};
