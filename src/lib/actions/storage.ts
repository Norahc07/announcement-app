"use server"

import { revalidatePath } from "next/cache"
import { STORAGE_QUOTA_BYTES } from "@/lib/constants"
import {
  countLocalBefore,
  deleteLocalBefore,
  getLocalExportPayload,
  getLocalStorageUsage,
  markLocalExported,
} from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { isExportOverdue, schoolYearLabel, schoolYearStart } from "@/lib/school-year"
import { requireAdmin, requireStaff } from "@/lib/supabase/server"

export type StorageUsage = {
  usedBytes: number
  quotaBytes: number
  driveBytes: number
  announcementBytes: number
  fileCount: number
  attachmentCount: number
  lastExportAt: string | null
  schoolYear: string
  cutoffIso: string
  previousYear: { announcements: number; files: number; events: number }
  exportOverdue: boolean
}

function revalidateStorage() {
  revalidatePath("/")
  revalidatePath("/", "layout")
  revalidatePath("/admin/storage")
  revalidatePath("/drive")
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const { supabase } = await requireAdmin()
  const cutoff = schoolYearStart().toISOString()

  if (isLocalMode() || !supabase) {
    const usage = await getLocalStorageUsage()
    const previousYear = await countLocalBefore(cutoff)
    return {
      ...usage,
      quotaBytes: STORAGE_QUOTA_BYTES,
      schoolYear: schoolYearLabel(),
      cutoffIso: cutoff,
      previousYear,
      exportOverdue: isExportOverdue(usage.lastExportAt),
    }
  }

  const [
    { data: files },
    { data: attachments },
    { data: settings },
    { count: oldPosts },
    { count: oldFiles },
    { count: oldEvents },
  ] = await Promise.all([
    supabase.from("files").select("size_bytes"),
    supabase.from("announcement_attachments").select("size_bytes"),
    supabase.from("app_settings").select("last_export_at").eq("id", 1).maybeSingle().then(
      (result) => result,
      () => ({ data: null, error: null })
    ),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .lt("created_at", cutoff),
    supabase.from("files").select("id", { count: "exact", head: true }).lt("created_at", cutoff),
    supabase.from("events").select("id", { count: "exact", head: true }).lt("starts_at", cutoff),
  ])

  const driveBytes = (files ?? []).reduce((sum, row) => sum + (row.size_bytes || 0), 0)
  const announcementBytes = (attachments ?? []).reduce(
    (sum, row) => sum + (row.size_bytes || 0),
    0
  )
  const lastExportAt = settings?.last_export_at ?? null

  return {
    usedBytes: driveBytes + announcementBytes,
    quotaBytes: STORAGE_QUOTA_BYTES,
    driveBytes,
    announcementBytes,
    fileCount: files?.length ?? 0,
    attachmentCount: attachments?.length ?? 0,
    lastExportAt,
    schoolYear: schoolYearLabel(),
    cutoffIso: cutoff,
    previousYear: {
      announcements: oldPosts ?? 0,
      files: oldFiles ?? 0,
      events: oldEvents ?? 0,
    },
    exportOverdue: isExportOverdue(lastExportAt),
  }
}

export async function usedStorageBytes() {
  const { supabase } = await requireStaff()
  if (isLocalMode() || !supabase) {
    const usage = await getLocalStorageUsage()
    return usage.usedBytes
  }
  const [{ data: files }, { data: attachments }] = await Promise.all([
    supabase.from("files").select("size_bytes"),
    supabase.from("announcement_attachments").select("size_bytes"),
  ])
  const driveBytes = (files ?? []).reduce((sum, row) => sum + (row.size_bytes || 0), 0)
  const announcementBytes = (attachments ?? []).reduce(
    (sum, row) => sum + (row.size_bytes || 0),
    0
  )
  return driveBytes + announcementBytes
}

export async function assertStorageRoom(extraBytes: number) {
  const used = await usedStorageBytes()
  if (used + extraBytes > STORAGE_QUOTA_BYTES) {
    return {
      error:
        "Storage is full (1 GB free-tier limit). Ask the principal to export last school year, then remove old files.",
    }
  }
  return { ok: true as const }
}

export async function exportSchoolData() {
  try {
    const { profile, supabase } = await requireAdmin()

    if (isLocalMode() || !supabase) {
      const payload = await getLocalExportPayload()
      await markLocalExported(profile.id)
      revalidateStorage()
      return { data: payload }
    }

    const [
      { data: profiles },
      { data: announcements },
      { data: attachments },
      { data: comments },
      { data: reactions },
      { data: events },
      { data: folders },
      { data: files },
    ] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role, created_at"),
      supabase.from("announcements").select("*"),
      supabase.from("announcement_attachments").select("*"),
      supabase.from("comments").select("*"),
      supabase.from("reactions").select("*"),
      supabase.from("events").select("*"),
      supabase.from("folders").select("*"),
      supabase.from("files").select("*"),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      school_year: schoolYearLabel(),
      users: profiles ?? [],
      announcements: announcements ?? [],
      attachments: attachments ?? [],
      comments: comments ?? [],
      reactions: reactions ?? [],
      events: events ?? [],
      folders: folders ?? [],
      files: files ?? [],
    }

    await supabase.from("app_settings").upsert({
      id: 1,
      last_export_at: payload.exported_at,
      updated_at: payload.exported_at,
      updated_by: profile.id,
    })

    revalidateStorage()
    return { data: payload }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not export.",
    }
  }
}

export async function deletePreviousSchoolYear() {
  try {
    const { supabase } = await requireAdmin()
    const cutoff = schoolYearStart().toISOString()

    if (isLocalMode() || !supabase) {
      const removed = await deleteLocalBefore(cutoff)
      revalidateStorage()
      revalidatePath("/")
      return { success: true, removed }
    }

    const { data: oldPosts } = await supabase
      .from("announcements")
      .select("id")
      .lt("created_at", cutoff)
    const postIds = (oldPosts ?? []).map((row) => row.id)

    if (postIds.length) {
      const { data: oldAttachments } = await supabase
        .from("announcement_attachments")
        .select("storage_path")
        .in("announcement_id", postIds)
      const attachmentPaths = (oldAttachments ?? []).map((row) => row.storage_path)
      if (attachmentPaths.length) {
        await supabase.storage.from("announcement-attachments").remove(attachmentPaths)
      }
      await supabase.from("announcements").delete().in("id", postIds)
    }

    const { data: oldFiles } = await supabase
      .from("files")
      .select("storage_path")
      .lt("created_at", cutoff)
    const filePaths = (oldFiles ?? []).map((row) => row.storage_path)
    if (filePaths.length) {
      await supabase.storage.from("drive-files").remove(filePaths)
    }
    await supabase.from("files").delete().lt("created_at", cutoff)
    await supabase.from("events").delete().lt("starts_at", cutoff)

    revalidateStorage()
    revalidatePath("/")
    return { success: true, removed: postIds.length + filePaths.length }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete old records.",
    }
  }
}
