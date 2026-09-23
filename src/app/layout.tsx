import type { Metadata } from "next"
import { Figtree, Fraunces } from "next/font/google"
import { cookies } from "next/headers"
import { Providers } from "@/components/providers"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { THEME_STORAGE_KEY, isAppTheme } from "@/lib/theme"
import "./globals.css"

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const stored = cookieStore.get(THEME_STORAGE_KEY)?.value
  const theme = isAppTheme(stored) ? stored : "light"

  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased ${theme}`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers initialTheme={theme}>{children}</Providers>
      </body>
    </html>
  )
}
