import { notFound } from "next/navigation"
import { StoragePanel } from "@/components/admin/storage-panel"
import { getStorageUsage } from "@/lib/actions/storage"
import { isAdmin } from "@/lib/constants"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function StoragePage() {
  const profile = await getSessionProfile()
  if (!profile) return null
  if (!isAdmin(profile.role)) notFound()

  const usage = await getStorageUsage()

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-2xl">Storage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Principal only · {usage.schoolYear}
        </p>
      </div>
      <StoragePanel usage={usage} />
    </div>
  )
}
