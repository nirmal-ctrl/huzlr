"use client"

import { useCallback, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps
  extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { resolvedTheme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(() => {
    if (!buttonRef.current) return

    const currentTheme = resolvedTheme ?? (document.documentElement.classList.contains("dark") ? "dark" : "light")
    const nextTheme = currentTheme === "dark" ? "light" : "dark"

    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(nextTheme)
      return
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme))
    })

    void transition.ready.then(() => {
      if (!buttonRef.current) return

      const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
        { duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      )
    }).catch(() => {
      setTheme(nextTheme)
    })
  }, [resolvedTheme, setTheme, duration])

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(className)}
      {...props}
    >
      <Sun className="hidden dark:block" aria-hidden="true" />
      <Moon className="dark:hidden" aria-hidden="true" />
    </button>
  )
}
