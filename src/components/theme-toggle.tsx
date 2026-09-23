"use client"

import { Moon, Sun } from "lucide-react"
import { useAppTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggle({
  variant = "switch",
  className,
}: {
  variant?: "switch" | "icon"
  className?: string
}) {
  const { theme, setTheme } = useAppTheme()
  const dark = theme === "dark"

  function toggle() {
    setTheme(dark ? "light" : "dark")
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted hover:text-foreground",
          className
        )}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-sidebar-accent/70",
        className
      )}
    >
      <span className="flex items-center gap-2">
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {dark ? "Light mode" : "Dark mode"}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          dark ? "bg-sidebar-primary" : "bg-sidebar-foreground/25"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
            dark && "translate-x-4"
          )}
        />
      </span>
    </button>
  )
}

export function ThemeToggleCard() {
  const { theme, setTheme } = useAppTheme()
  const dark = theme === "dark"

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/8">
      <h2 className="font-heading text-lg">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Switch the whole Staff Board between light and dark.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "rounded-xl px-3 py-3 text-sm font-medium ring-1 transition-colors",
            !dark
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-muted/60 text-foreground ring-foreground/10 hover:bg-muted"
          )}
        >
          <Sun className="mx-auto mb-1 size-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "rounded-xl px-3 py-3 text-sm font-medium ring-1 transition-colors",
            dark
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-muted/60 text-foreground ring-foreground/10 hover:bg-muted"
          )}
        >
          <Moon className="mx-auto mb-1 size-4" />
          Dark
        </button>
      </div>
    </div>
  )
}
