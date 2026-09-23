"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  FolderOpen,
  HardDrive,
  LogOut,
  Megaphone,
  Users,
} from "lucide-react"
import { StorageMeter } from "@/components/admin/storage-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { signOut } from "@/lib/actions/auth"
import { APP_NAME, ROLE_LABELS, isAdmin } from "@/lib/constants"
import { initials } from "@/lib/format"
import type { Profile } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Feed", icon: Megaphone },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/drive", label: "Drive", icon: FolderOpen },
]

export function AppShell({
  profile,
  children,
  storageUsage,
}: {
  profile: Profile
  children: React.ReactNode
  storageUsage?: { usedBytes: number; quotaBytes: number } | null
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    if (href === "/users") {
      return pathname === "/users" || pathname.startsWith("/admin/users")
    }
    return pathname.startsWith(href)
  }

  const items = [
    ...NAV,
    ...(isAdmin(profile.role)
      ? [
          { href: "/users", label: "Staff", icon: Users },
          { href: "/admin/storage", label: "Storage", icon: HardDrive },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <p className="font-heading text-xl tracking-tight">{APP_NAME}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            School staff portal
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4">
          {storageUsage ? (
            <Link
              href="/admin/storage"
              className="mb-3 block rounded-lg px-2 py-2 hover:bg-sidebar-accent/70"
            >
              <StorageMeter
                usedBytes={storageUsage.usedBytes}
                quotaBytes={storageUsage.quotaBytes}
                compact
                variant="sidebar"
              />
            </Link>
          ) : null}
          <ThemeToggle className="mb-1 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground" />
          <Separator className="my-3 bg-sidebar-border" />
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/70"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-sidebar-foreground/70">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
          </Link>
          <form action={signOut} className="mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              type="submit"
            >
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-lg leading-none">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="icon" />
            <Link href="/profile">
              <Avatar size="sm">
                <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
        {storageUsage ? (
          <Link href="/admin/storage" className="mt-2 block">
            <StorageMeter
              usedBytes={storageUsage.usedBytes}
              quotaBytes={storageUsage.quotaBytes}
              compact
            />
          </Link>
        ) : null}
      </header>

      <main className="min-h-screen pb-24 lg:ml-64 lg:pb-8">
        <div className="w-full px-5 py-6 sm:px-8 lg:px-10 xl:px-12">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur lg:hidden">
        <ul
          className={cn(
            "grid",
            items.length >= 5
              ? "grid-cols-5"
              : items.length > 3
                ? "grid-cols-4"
                : "grid-cols-3"
          )}
        >
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
