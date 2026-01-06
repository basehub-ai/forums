"use client"

import { DotGrid } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function useShaderColors() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return { background: "#040404", foreground: "#303030" }
  }

  const isDark = resolvedTheme === "dark"
  return {
    background: isDark ? "#04040495" : "#fafafa95",
    foreground: isDark ? "#404040" : "#d9d9d9",
  }
}

type DotsProps = {
  className?: string
  colorBackground?: string
  colorForeground?: string
}

function DotsGrid({
  colorBackground,
  colorForeground,
}: {
  colorBackground?: string
  colorForeground?: string
}) {
  const colors = useShaderColors()

  return (
    <DotGrid
      colorBack={colorBackground ?? colors.background}
      colorFill={colorForeground ?? colors.foreground}
      gapX={16}
      gapY={16}
      opacityRange={0}
      scale={0.2}
      shape="circle"
      size={5}
      sizeRange={0.6}
      style={{ width: "100%", height: "100%" }}
    />
  )
}

export function DotsShadow({
  className,
  colorBackground,
  colorForeground,
}: DotsProps) {
  return (
    <div
      className={cn(
        "absolute top-1.5 left-1.5 -z-10 h-full w-full overflow-hidden",
        className
      )}
    >
      <DotsGrid
        colorBackground={colorBackground}
        colorForeground={colorForeground}
      />
    </div>
  )
}

export function DotsBackground({ className }: DotsProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <DotsGrid />
    </div>
  )
}
