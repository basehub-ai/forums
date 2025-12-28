"use client"
import { usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "./button"

export const SignInButton = () => {
  const pathname = usePathname()
  return (
    <Button
      onClick={() =>
        authClient.signIn.social({ provider: "github", callbackURL: pathname })
      }
      type="button"
      variant="secondary"
    >
      Log In
    </Button>
  )
}
