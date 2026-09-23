"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  addComment,
  deleteComment,
  updateComment,
} from "@/lib/actions/announcements"
import { ROLE_LABELS, isStaff } from "@/lib/constants"
import { fromNow, initials } from "@/lib/format"
import type { Comment, Profile } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function CommentThread({
  announcementId,
  comments,
  profile,
  previewCount,
}: {
  announcementId: string
  comments: Comment[]
  profile: Profile
  previewCount?: number
}) {
  const [body, setBody] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(!previewCount)
  const visible =
    !previewCount || expanded ? comments : comments.slice(-previewCount)

  function onSubmit(event?: React.FormEvent) {
    event?.preventDefault()
    startTransition(async () => {
      const result = await addComment(announcementId, body)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setBody("")
    })
  }

  function onDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return
    startTransition(async () => {
      const result = await deleteComment(commentId, announcementId)
      if (result.error) toast.error(result.error)
    })
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  function saveEdit() {
    if (!editingId) return
    startTransition(async () => {
      const result = await updateComment(editingId, announcementId, editBody)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setEditingId(null)
      toast.success("Comment updated.")
    })
  }

  return (
    <div className="space-y-3">
      {previewCount && comments.length > previewCount && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm font-medium text-muted-foreground hover:underline"
        >
          View all {comments.length} comments
        </button>
      ) : null}

      {visible.map((comment) => {
        const own = comment.author_id === profile.id
        const canDelete = own || isStaff(profile.role)
        const edited = Boolean(
          comment.updated_at && comment.updated_at !== comment.created_at
        )
        return (
          <div key={comment.id} className="flex gap-2.5">
            <Avatar size="sm">
              <AvatarFallback>
                {initials(comment.author?.full_name || "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {editingId === comment.id ? (
                <div className="rounded-2xl bg-muted/70 px-3 py-2">
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    className="min-h-16 bg-background"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveEdit}
                      disabled={pending || !editBody.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-muted/70 px-3 py-2">
                    <p className="text-sm font-medium">
                      {comment.author?.full_name}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {comment.author ? ROLE_LABELS[comment.author.role] : ""}
                      </span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">
                      {comment.body}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                    <span>{fromNow(comment.created_at)}</span>
                    {edited ? <span>Edited</span> : null}
                    {own ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(comment)}
                        className="font-medium hover:text-foreground hover:underline"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onDelete(comment.id)}
                        className="font-medium hover:text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}

      <form onSubmit={onSubmit} className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (body.trim() && !pending) onSubmit()
            }
          }}
          placeholder="Write a comment…"
          className="h-9 min-w-0 flex-1 rounded-full bg-muted/80 px-3.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  )
}
