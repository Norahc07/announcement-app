export const THEME_STORAGE_KEY = "staff-board-theme"

export type AppTheme = "light" | "dark"

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return value === "light" || value === "dark"
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
  root.style.colorScheme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore private-mode write failures */
  }
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
}

export function readStoredTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isAppTheme(stored)) return stored
  } catch {
    /* ignore */
  }
  return "light"
}
