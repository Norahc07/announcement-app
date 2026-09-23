import { ExportReminder } from "@/components/admin/export-reminder"
import { AnnouncementFeed } from "@/components/announcements/feed"
import { UpcomingEvents } from "@/components/calendar/upcoming-events"
import { isAdmin } from "@/lib/constants"
import {
  cachedAnnouncements,
  cachedStorageUsage,
  cachedUpcomingEvents,
} from "@/lib/data/cached"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function HomePage() {
  const profile = await getSessionProfile()
  if (!profile) return null

  const [posts, upcoming, usage] = await Promise.all([
    cachedAnnouncements(),
    cachedUpcomingEvents(),
    isAdmin(profile.role) ? cachedStorageUsage().catch(() => null) : null,
  ])

  return (
    <div className="grid min-h-[calc(100vh-5.5rem)] gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <div className="mb-6">
          <h1 className="font-heading text-3xl tracking-tight">Bulletin</h1>
        </div>
        {usage?.exportOverdue ? (
          <ExportReminder schoolYear={usage.schoolYear} />
        ) : null}
        <AnnouncementFeed posts={posts} profile={profile} />
      </div>
      <div className="xl:sticky xl:top-8 xl:self-start">
        <UpcomingEvents events={upcoming} />
      </div>
    </div>
  )
}
