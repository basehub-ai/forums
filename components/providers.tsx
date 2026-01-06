"use client"

import { AutumnProvider } from "autumn-js/react"
import { ThemeProvider } from "next-themes"
import { Dialogs } from "@/components/dialogs"
import { getSiteOrigin } from "@/lib/utils"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AutumnProvider betterAuthUrl={getSiteOrigin()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        {children}
        <Dialogs />
      </ThemeProvider>
    </AutumnProvider>
  )
}
