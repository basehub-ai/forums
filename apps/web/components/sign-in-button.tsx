"use client"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "./button"

export const SignInButton = () => {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      disabled={isLoading}
      onClick={() => {
        setIsLoading(true)
        authClient.signIn.social({ provider: "github", callbackURL: pathname })
      }}
      size="sm"
      type="button"
      variant="secondary"
    >
      {isLoading ? "Loading…" : "Log In"}
    </Button>
  )
}
