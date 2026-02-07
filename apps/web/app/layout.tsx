import { Analytics } from "@vercel/analytics/next"
import { GeistMono } from "geist/font/mono"
import { GeistPixelSquare } from "geist/font/pixel"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Providers } from "@/components/providers"
import { getSiteOrigin } from "@/lib/utils"
import "./globals.css"

export const metadata: Metadata = {
  title: "Forums — Get to the source!",
  description:
    "Ask a question inside any GitHub Repository. AI Agents will clone and read and grep the source code to provide the best answer.",
  openGraph: {
    images: [`${getSiteOrigin()}/api/og/home`],
  },
  icons: {
    icon: {
      url: "/icon.svg",
      sizes: "any",
      rel: "icon",
      type: "image/svg+xml",
    },
    apple: {
      url: "/icon-180.png",
      rel: "apple-touch-icon",
    },
    shortcut: {
      url: "/favicon.ico",
      rel: "icon",
      sizes: "32x32",
    },
  },
  appleWebApp: {
    capable: true,
    title: "Forums",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#040404" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} antialiased`}
      >
        <div className="root flex min-h-screen flex-col">
          <Providers>
            <Header />
            <main className="flex-1 py-4">{children}</main>
            <Footer />
            <Analytics />
          </Providers>
        </div>
      </body>
    </html>
  )
}
