import Link from "next/link"

import { cn } from "@/lib/utils"

type LogoSize = "sm" | "md" | "lg"

const sizeStyles: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
}

interface LogoProps {
  size?: LogoSize
  href?: string | null
  className?: string
}

export function Logo({ size = "md", href = "/", className }: LogoProps) {
  const wordmark = (
    <span
      className={cn(
        "font-serif font-extrabold tracking-tight",
        sizeStyles[size],
      )}
    >
      <span className="text-ink">huzlr</span>
      <span className="text-clay">.</span>
    </span>
  )

  if (!href) {
    return wordmark
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-baseline hover:opacity-80 transition-opacity",
        className,
      )}
    >
      {wordmark}
    </Link>
  )
}
