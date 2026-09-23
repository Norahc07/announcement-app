"use server"

import { revalidatePath } from "next/cache"
import {
  ANNOUNCEMENT_MAX_BYTES,
  isStaff,
} from "@/lib/constants"
import { assertStorageRoom } from "@/lib/actions/storage"
import {
  addLocalComment,
  createLocalAnnouncement,
  deleteLocalAnnouncement,
  deleteLocalComment,
  setLocalReaction,
  toggleLocalPin,
  updateLocalAnnouncement,
  updateLocalComment,
} from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { requireProfile, requireStaff } from "@/lib/supabase/server"
import type { ReactionType } from "@/lib/types"

function revalidateFeed(announcementId?: string) {
  revalidatePath("/")
  if (announcementId) revalidatePath(`/announcements/${announcementId}`)
}

function revalidateFeedAndStorage(announcementId?: string) {
  revalidateFeed(announcementId)
  revalidatePath("/", "layout")
  revalidatePath("/admin/storage")
}

function isAllowedAnnouncementFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type === "application/pdf" ||
    /\.(pdf|png|jpe?g|gif|webp|mp4|webm|mov|m4v)$/i.test(file.name)
  )
}

export async function createAnnouncement(formData: FormData) {
  try {
    const { profile, supabase } = await requireStaff()
    const body = String(formData.get("body") || "").trim()
    const pinned = String(formData.get("pinned") || "") === "on"

    if (!body) {
      return { error: "Write something before posting." }
    }
    if (body.length > 5000) {
      return { error: "Announcements can be up to 5,000 characters." }
    }

    const rawFiles = formData.getAll("files")
    const files = rawFiles.filter(
      (item): item is File => item instanceof File && item.size > 0
    )

    for (const file of files) {
      if (file.size > ANNOUNCEMENT_MAX_BYTES) {
        return { error: `${file.name} is over 10 MB.` }
      }
      if (!isAllowedAnnouncementFile(file)) {
        return { error: `${file.name} must be an image, video, or PDF.` }
      }
    }

    const incoming = files.reduce((sum, file) => sum + file.size, 0)
    if (incoming) {
      const room = await assertStorageRoom(incoming)
      if (room.error) return room
    }

    if (isLocalMode() || !supabase) {
      const id = await createLocalAnnouncement({
        authorId: profile.id,
        body,
        pinned,
        files,
      })
      revalidateFeedAndStorage(id)
      return { success: true }
    }

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({ author_id: profile.id, body, pinned })
      .select("id")
      .single()

    if (error || !announcement) {
      return { error: error?.message || "Could not post the announcement." }
    }

    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
      const path = `${announcement.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage
        .from("announcement-attachments")
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        return { error: `Uploaded the post, but ${file.name} failed: ${uploadError.message}` }
      }

      await supabase.from("announcement_attachments").insert({
        announcement_id: announcement.id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      })
    }

    revalidateFeedAndStorage(announcement.id)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not post." }
  }
}

export async function updateAnnouncement(announcementId: string, body: string) {
  try {
    const { supabase } = await requireStaff()
    const trimmed = body.trim()
    if (!trimmed) return { error: "Announcement cannot be empty." }
    if (isLocalMode() || !supabase) {
      await updateLocalAnnouncement(announcementId, trimmed)
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }
    const { error } = await supabase
      .from("announcements")
      .update({ body: trimmed })
      .eq("id", announcementId)

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update." }
  }
}

export async function togglePin(announcementId: string, pinned: boolean) {
  try {
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await toggleLocalPin(announcementId, pinned)
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }
    const { error } = await supabase
      .from("announcements")
      .update({ pinned })
      .eq("id", announcementId)

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not pin." }
  }
}

export async function deleteAnnouncement(announcementId: string) {
  try {
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await deleteLocalAnnouncement(announcementId)
      revalidateFeedAndStorage()
      return { success: true }
    }
    const { data: attachments } = await supabase
      .from("announcement_attachments")
      .select("storage_path")
      .eq("announcement_id", announcementId)

    const paths = (attachments ?? []).map((row) => row.storage_path)
    if (paths.length) {
      await supabase.storage.from("announcement-attachments").remove(paths)
    }

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)

    if (error) return { error: error.message }
    revalidateFeedAndStorage()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete." }
  }
}

export async function setReaction(
  announcementId: string,
  type: ReactionType | null
) {
  try {
    const { profile, supabase } = await requireProfile()

    if (isLocalMode() || !supabase) {
      await setLocalReaction(announcementId, profile.id, type)
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }

    await supabase
      .from("reactions")
      .delete()
      .eq("announcement_id", announcementId)
      .eq("user_id", profile.id)

    if (type) {
      const { error } = await supabase.from("reactions").insert({
        announcement_id: announcementId,
        user_id: profile.id,
        type,
      })
      if (error) return { error: error.message }
    }

    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not react." }
  }
}

export async function addComment(announcementId: string, body: string) {
  try {
    const { profile, supabase } = await requireProfile()
    const trimmed = body.trim()
    if (!trimmed) return { error: "Write a comment first." }
    if (trimmed.length > 1000) {
      return { error: "Comments can be up to 1,000 characters." }
    }

    if (isLocalMode() || !supabase) {
      await addLocalComment(announcementId, profile.id, trimmed)
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }

    const { error } = await supabase.from("comments").insert({
      announcement_id: announcementId,
      author_id: profile.id,
      body: trimmed,
    })

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not comment." }
  }
}

export async function updateComment(
  commentId: string,
  announcementId: string,
  body: string
) {
  try {
    const { profile, supabase } = await requireProfile()
    const trimmed = body.trim()
    if (!trimmed) return { error: "Comment cannot be empty." }
    if (trimmed.length > 1000) {
      return { error: "Comments can be up to 1,000 characters." }
    }

    if (isLocalMode() || !supabase) {
      await updateLocalComment(commentId, profile.id, trimmed)
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }

    const { error } = await supabase
      .from("comments")
      .update({ body: trimmed, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("author_id", profile.id)

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not edit comment.",
    }
  }
}

export async function deleteComment(commentId: string, announcementId: string) {
  try {
    const { profile, supabase } = await requireProfile()
    if (isLocalMode() || !supabase) {
      await deleteLocalComment(commentId, profile.id, isStaff(profile.role))
      revalidatePath("/")
      revalidatePath(`/announcements/${announcementId}`)
      return { success: true }
    }
    const { error } = await supabase.from("comments").delete().eq("id", commentId)
    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath(`/announcements/${announcementId}`)
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete comment.",
    }
  }
}
