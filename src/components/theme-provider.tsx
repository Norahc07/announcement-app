"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { applyTheme, readStoredTheme, type AppTheme } from "@/lib/theme"

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  mounted: false,
})

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: React.ReactNode
  initialTheme?: AppTheme
}) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = readStoredTheme()
    setThemeState(current)
    applyTheme(current)
    setMounted(true)
  }, [])

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next)
    applyTheme(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
