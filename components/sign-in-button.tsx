"use client"
import { usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export const SignInButton = () => {
  const pathname = usePathname()
  return (
    <button
      onClick={() =>
        authClient.signIn.social({ provider: "github", callbackURL: pathname })
      }
      type="button"
    >
      Log In
    </button>
  )
}
