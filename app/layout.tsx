import { Analytics } from "@vercel/analytics/next"
import { AutumnProvider } from "autumn-js/react"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import "./globals.css"
import { getSiteOrigin } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Forums — Get to the source!",
  description:
    "Ask a question inside any GitHub Repository. AI Agents will clone and read and grep the source code to provide the best answer.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <div className="root flex min-h-screen flex-col">
          <AutumnProvider betterAuthUrl={getSiteOrigin()}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              disableTransitionOnChange
              enableSystem
            >
              <Header />
              <main className="flex-1 py-4">{children}</main>
              <Footer />
            </ThemeProvider>
            <Analytics />
          </AutumnProvider>
        </div>
      </body>
    </html>
  )
}
