"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
  exact?: boolean
}

export function NavLink({
  href,
  children,
  className = "",
  exact = false,
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link className={`relative z-10 bg-background ${className}`} href={href}>
      <span
        className={`whitespace-nowrap font-semibold text-[15px] uppercase leading-5 tracking-tight hover:text-bright hover:underline ${
          isActive ? "text-bright" : "text-faint"
        }`}
      >
        {children}
      </span>
    </Link>
  )
}
