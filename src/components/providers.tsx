"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import type { AppTheme } from "@/lib/theme"

export function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: AppTheme
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      {children}
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  )
}
