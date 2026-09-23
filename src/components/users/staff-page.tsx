import { notFound } from "next/navigation"
import { UsersManager } from "@/components/users/users-manager"
import { isAdmin } from "@/lib/constants"
import { getProfiles } from "@/lib/data/users"
import { getSessionProfile } from "@/lib/supabase/server"

export async function StaffAccountsPage() {
  const profile = await getSessionProfile()
  if (!profile) return null
  if (!isAdmin(profile.role)) notFound()

  const profiles = await getProfiles()

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-2xl">Staff</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profiles.length} {profiles.length === 1 ? "account" : "accounts"}
        </p>
      </div>
      <UsersManager profiles={profiles} currentUserId={profile.id} />
    </div>
  )
}
