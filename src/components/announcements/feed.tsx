import { Megaphone } from "lucide-react"
import { isStaff } from "@/lib/constants"
import type { Announcement, Profile } from "@/lib/types"
import { AnnouncementComposer } from "@/components/announcements/composer"
import { PostCard } from "@/components/announcements/post-card"

export function AnnouncementFeed({
  posts,
  profile,
}: {
  posts: Announcement[]
  profile: Profile
}) {
  return (
    <div>
      {isStaff(profile.role) ? (
        <AnnouncementComposer profile={profile} />
      ) : null}

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <Megaphone className="mx-auto size-10 text-primary/70" />
          <h2 className="font-heading mt-4 text-xl">No announcements yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When Ma&apos;am Lorna or the AO posts, it will stay here at the top
            of the feed — not buried under group chat messages.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}
