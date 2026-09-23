import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CommentThread } from "@/components/announcements/comment-thread"
import { PostCard } from "@/components/announcements/post-card"
import { Button } from "@/components/ui/button"
import { cachedAnnouncement } from "@/lib/data/cached"
import { getSessionProfile } from "@/lib/supabase/server"

function crumbLabel(body: string) {
  const line = body.replace(/\s+/g, " ").trim()
  if (line.length <= 48) return line || "Announcement"
  return `${line.slice(0, 48).trim()}…`
}

export default async function AnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getSessionProfile()
  if (!profile) return null

  const post = await cachedAnnouncement(id)
  if (!post) notFound()

  return (
    <div className="flex min-h-[calc(100vh-5.5rem)] flex-col">
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/" />}
        >
          <ChevronLeft data-icon="inline-start" />
          Back to Bulletin
        </Button>
        <nav className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Bulletin
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="truncate text-foreground">{crumbLabel(post.body)}</span>
        </nav>
      </div>
      <div className="grid flex-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <PostCard post={post} profile={profile} focused />
        <section className="h-full min-h-[28rem] rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/8 sm:p-6 xl:min-h-[calc(100vh-12rem)]">
          <p className="mb-4 text-sm font-medium">
            {post.comments.length}{" "}
            {post.comments.length === 1 ? "comment" : "comments"}
          </p>
          <CommentThread
            announcementId={post.id}
            comments={post.comments}
            profile={profile}
          />
        </section>
      </div>
    </div>
  )
}
