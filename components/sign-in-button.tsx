"use client"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "./button"

export const SignInButton = () => {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      onClick={() => {
        setIsLoading(true)
        authClient.signIn.social({ provider: "github", callbackURL: pathname })
      }}
      size="sm"
      type="button"
      variant="secondary"
      disabled={isLoading}
    >
      {isLoading ? "Loading…" : "Log In"}
    </Button>
  )
}
