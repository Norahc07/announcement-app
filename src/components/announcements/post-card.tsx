"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Download, Globe, MessageCircle, MoreHorizontal, Pin } from "lucide-react"
import { toast } from "sonner"
import {
  deleteAnnouncement,
  setReaction,
  togglePin,
  updateAnnouncement,
} from "@/lib/actions/announcements"
import { REACTIONS, ROLE_LABELS, isStaff } from "@/lib/constants"
import { fromNow, initials } from "@/lib/format"
import type { Announcement, Profile, ReactionType } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { AnnouncementImages } from "@/components/announcements/fit-image"
import { cn } from "@/lib/utils"

export function PostCard({
  post,
  profile,
  focused = false,
}: {
  post: Announcement
  profile: Profile
  focused?: boolean
}) {
  const staff = isStaff(profile.role)
  const href = `/announcements/${post.id}`
  const myReaction = post.reactions.find((item) => item.user_id === profile.id)
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(post.body)
  const [expanded, setExpanded] = useState(focused)

  const totalReactions = post.reactions.length
  const usedReactions = REACTIONS.filter((reaction) =>
    post.reactions.some((item) => item.type === reaction.type)
  )
  const longBody = post.body.length > 220
  const bodyText =
    focused || expanded || !longBody
      ? post.body
      : `${post.body.slice(0, 200).trimEnd()}…`

  function react(type: ReactionType) {
    const next = myReaction?.type === type ? null : type
    startTransition(async () => {
      const result = await setReaction(post.id, next)
      if (result.error) toast.error(result.error)
    })
  }

  function onPin() {
    startTransition(async () => {
      const result = await togglePin(post.id, !post.pinned)
      if (result.error) toast.error(result.error)
    })
  }

  function onDelete() {
    if (!confirm("Delete this announcement and its comments?")) return
    startTransition(async () => {
      const result = await deleteAnnouncement(post.id)
      if (result.error) toast.error(result.error)
      else toast.success("Announcement deleted.")
    })
  }

  function onSaveEdit() {
    startTransition(async () => {
      const result = await updateAnnouncement(post.id, editBody)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setEditing(false)
      toast.success("Announcement updated.")
    })
  }

  const images = post.attachments.filter((file) =>
    (file.mime_type || "").startsWith("image/")
  )
  const videos = post.attachments.filter((file) =>
    (file.mime_type || "").startsWith("video/")
  )
  const otherFiles = post.attachments.filter(
    (file) =>
      !(file.mime_type || "").startsWith("image/") &&
      !(file.mime_type || "").startsWith("video/")
  )

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-foreground/8",
        post.pinned && "ring-amber-400/80"
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials(post.author?.full_name || "?")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">
              {post.author?.full_name}
            </p>
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {post.author ? ROLE_LABELS[post.author.role] : ""}
              <span aria-hidden>·</span>
              {fromNow(post.created_at)}
              {post.updated_at !== post.created_at ? " · Edited" : ""}
              <Globe className="size-3" />
              {post.pinned ? (
                <>
                  <span aria-hidden>·</span>
                  <Pin className="size-3 text-amber-600" />
                  Pinned
                </>
              ) : null}
            </p>
          </div>
        </div>
        {staff ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="relative z-10 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPin}>
                {post.pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditBody(post.body)
                  setEditing(true)
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      <div className="px-4 pt-2 pb-3">
        <p
          className={cn(
            "whitespace-pre-wrap leading-[1.4]",
            focused ? "text-base" : "text-[15px]"
          )}
        >
          {bodyText}
        </p>
        {!focused && longBody && !expanded ? (
          <button
            type="button"
            className="relative z-10 mt-0.5 text-[15px] font-medium text-muted-foreground hover:underline"
            onClick={() => setExpanded(true)}
          >
            See more
          </button>
        ) : null}
      </div>

      {images.length ? (
        focused ? (
          <AnnouncementImages images={images} focused />
        ) : (
          <Link href={href} className="relative z-10 block" aria-label="Open photos">
            <AnnouncementImages images={images} />
          </Link>
        )
      ) : null}

      {videos.length
        ? videos.map((video) =>
            video.url ? (
              <video
                key={video.id}
                src={video.url}
                controls
                className="relative z-10 max-h-80 w-full bg-muted"
              />
            ) : null
          )
        : null}

      {otherFiles.length ? (
        <ul className="space-y-2 px-4 pb-2">
          {otherFiles.map((file) => (
            <li key={file.id}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="relative z-10 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm hover:bg-muted/80"
              >
                <Download className="size-4" />
                {file.file_name}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {totalReactions > 0 || post.comments.length > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 text-[13px] text-muted-foreground">
          {totalReactions > 0 ? (
            <p className="flex min-w-0 items-center gap-1.5">
              <span className="flex -space-x-1">
                {usedReactions.map((reaction) => (
                  <span
                    key={reaction.type}
                    className="inline-flex size-5 items-center justify-center rounded-full bg-card text-[11px] ring-1 ring-background"
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </span>
              <span>{totalReactions}</span>
            </p>
          ) : (
            <span />
          )}
          {post.comments.length > 0 ? (
            focused ? (
              <span>
                {post.comments.length}{" "}
                {post.comments.length === 1 ? "comment" : "comments"}
              </span>
            ) : (
              <Link href={href} className="relative z-10 hover:underline">
                {post.comments.length}{" "}
                {post.comments.length === 1 ? "comment" : "comments"}
              </Link>
            )
          ) : null}
        </div>
      ) : null}

      <div className="relative z-10 mx-3 mt-1.5 mb-1 grid grid-cols-2 border-t border-foreground/8">
        <ReactionButton
          active={myReaction}
          pending={pending}
          onReact={react}
        />
        {focused ? (
          <span className="inline-flex items-center justify-center gap-2 rounded-md py-2 text-[15px] font-medium text-muted-foreground">
            <MessageCircle className="size-5" />
            Comment
          </span>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center justify-center gap-2 rounded-md py-2 text-[15px] font-medium text-muted-foreground hover:bg-muted"
          >
            <MessageCircle className="size-5" />
            Comment
          </Link>
        )}
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={onSaveEdit} disabled={pending || !editBody.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function ReactionButton({
  active,
  pending,
  onReact,
}: {
  active?: { type: ReactionType }
  pending: boolean
  onReact: (type: ReactionType) => void
}) {
  const current = REACTIONS.find((item) => item.type === active?.type)

  return (
    <div className="group/react relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => onReact(current?.type ?? "like")}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md py-2 text-[15px] font-medium hover:bg-muted",
          current ? "text-primary" : "text-muted-foreground"
        )}
      >
        <span className="text-base">{current?.emoji ?? "👍"}</span>
        {current?.label ?? "Like"}
      </button>
      <div className="invisible absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 gap-1 rounded-full bg-card px-1.5 py-1 shadow-md ring-1 ring-foreground/10 group-hover/react:visible group-focus-within/react:visible">
        {REACTIONS.map((reaction) => (
          <button
            key={reaction.type}
            type="button"
            title={reaction.label}
            disabled={pending}
            onClick={() => onReact(reaction.type)}
            className="size-9 rounded-full text-lg hover:scale-125"
          >
            {reaction.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
