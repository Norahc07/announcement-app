import { createClient } from "@/lib/supabase/server"
import { isLocalMode } from "@/lib/local/mode"
import {
  getLocalAnnouncement,
  listAnnouncements,
} from "@/lib/local/db"
import type { Announcement, AnnouncementAttachment } from "@/lib/types"

async function signAttachments(
  attachments: AnnouncementAttachment[]
): Promise<AnnouncementAttachment[]> {
  if (!attachments.length) return attachments
  const supabase = await createClient()
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from("announcement-attachments")
        .createSignedUrl(attachment.storage_path, 3600)
      return { ...attachment, url: data?.signedUrl }
    })
  )
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (isLocalMode()) return listAnnouncements()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      *,
      author:profiles!author_id (id, full_name, role),
      attachments:announcement_attachments (*),
      comments (
        id, announcement_id, author_id, body, created_at, updated_at,
        author:profiles!author_id (id, full_name, role)
      ),
      reactions (*)
    `
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as Announcement[]
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      attachments: await signAttachments(row.attachments ?? []),
      comments: (row.comments ?? []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      reactions: row.reactions ?? [],
    }))
  )
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  if (isLocalMode()) return getLocalAnnouncement(id)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      *,
      author:profiles!author_id (id, full_name, role),
      attachments:announcement_attachments (*),
      comments (
        id, announcement_id, author_id, body, created_at, updated_at,
        author:profiles!author_id (id, full_name, role)
      ),
      reactions (*)
    `
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as Announcement
  return {
    ...row,
    attachments: await signAttachments(row.attachments ?? []),
    comments: (row.comments ?? []).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
    reactions: row.reactions ?? [],
  }
}
