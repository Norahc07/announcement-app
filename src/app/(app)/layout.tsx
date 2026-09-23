import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { cachedStorageUsage } from "@/lib/data/cached"
import { isAdmin } from "@/lib/constants"
import { getSessionProfile } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getSessionProfile()
  if (!profile) {
    redirect("/login")
  }

  const usage = isAdmin(profile.role)
    ? await cachedStorageUsage().catch(() => null)
    : null

  return (
    <AppShell
      profile={profile}
      storageUsage={
        usage
          ? { usedBytes: usage.usedBytes, quotaBytes: usage.quotaBytes }
          : null
      }
    >
      {children}
    </AppShell>
  )
}
