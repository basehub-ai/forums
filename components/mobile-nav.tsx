"use client"

import Link from "next/link"
import { useState } from "react"

const navLinks = [
  { href: "http://x.com/basehub_ai", label: "About Us", external: true },
  { href: "/basehub-ai/forums", label: "Help", external: true },
  {
    href: "https://github.com/basehub-ai/forums",
    label: "GitHub",
    external: true,
  },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative md:hidden">
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="flex h-8 w-8 items-center justify-center text-muted hover:text-bright"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg
          className="transition-transform"
          fill="none"
          height="20"
          viewBox="0 0 20 20"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>menu</title>
          {isOpen ? (
            <path
              d="M5 5L15 15M5 15L15 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          ) : (
            <>
              <path
                d="M3 5H17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
              <path
                d="M3 10H17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
              <path
                d="M3 15H17"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 z-50 mt-2 min-w-40 border border-faint/20 bg-background py-1 shadow-lg">
            {navLinks.map((link) => (
              <Link
                className="block px-4 py-2 font-medium text-faint text-sm hover:bg-accent/5 hover:text-muted"
                href={link.href}
                key={link.href}
                onClick={() => setIsOpen(false)}
                target={link.external ? "_blank" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
