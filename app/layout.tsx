import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Header } from "@/components/header"
import "./globals.css"

export const metadata: Metadata = {
  title: "Forums | A BaseHub Experiment",
  description: "An experiment by BaseHub.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <div className="root">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <Header />
            <main className="py-4">{children}</main>
          </ThemeProvider>
          <Analytics />
        </div>
      </body>
    </html>
  )
}
