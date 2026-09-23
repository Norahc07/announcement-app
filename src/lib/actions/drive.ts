"use server"

import { revalidatePath } from "next/cache"
import { DRIVE_MAX_BYTES } from "@/lib/constants"
import { assertStorageRoom } from "@/lib/actions/storage"
import {
  createLocalFolder,
  deleteLocalFile,
  deleteLocalFolder,
  getLocalFile,
  moveLocalFile,
  renameLocalFile,
  renameLocalFolder,
  uploadLocalDriveFiles,
} from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { requireProfile, requireStaff } from "@/lib/supabase/server"

function drivePath(folderId: string | null, fileName: string) {
  const safeName = fileName.replace(/[^\w.\- ]+/g, "_")
  const folder = folderId ?? "root"
  return `${folder}/${crypto.randomUUID()}-${safeName}`
}

function revalidateDrive(folderId?: string | null) {
  revalidatePath("/drive")
  if (folderId) revalidatePath(`/drive/${folderId}`)
  revalidatePath("/", "layout")
  revalidatePath("/admin/storage")
}

export async function createFolder(parentId: string | null, name: string) {
  try {
    const { profile, supabase } = await requireStaff()
    const trimmed = name.trim()
    if (!trimmed) return { error: "Folder name is required." }

    if (isLocalMode() || !supabase) {
      await createLocalFolder(parentId, trimmed, profile.id)
      revalidateDrive(parentId)
      return { success: true }
    }

    const { error } = await supabase.from("folders").insert({
      name: trimmed,
      parent_id: parentId,
      created_by: profile.id,
    })

    if (error) return { error: error.message }
    revalidateDrive(parentId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create folder." }
  }
}

export async function renameFolder(folderId: string, name: string) {
  try {
    const { supabase } = await requireStaff()
    const trimmed = name.trim()
    if (!trimmed) return { error: "Folder name is required." }
    if (isLocalMode() || !supabase) {
      await renameLocalFolder(folderId, trimmed)
      revalidatePath("/drive")
      revalidatePath(`/drive/${folderId}`)
      return { success: true }
    }
    const { error } = await supabase
      .from("folders")
      .update({ name: trimmed })
      .eq("id", folderId)
    if (error) return { error: error.message }
    revalidatePath("/drive")
    revalidatePath(`/drive/${folderId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not rename." }
  }
}

export async function deleteFolder(folderId: string, parentId: string | null) {
  try {
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await deleteLocalFolder(folderId)
      revalidateDrive(parentId)
      return { success: true }
    }

    const { data: allFolders } = await supabase.from("folders").select("id, parent_id")
    const ids = new Set<string>([folderId])
    let added = true
    while (added) {
      added = false
      for (const folder of allFolders ?? []) {
        if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
          ids.add(folder.id)
          added = true
        }
      }
    }

    const { data: allFiles } = await supabase
      .from("files")
      .select("folder_id, storage_path")

    const paths = (allFiles ?? [])
      .filter((file) => file.folder_id && ids.has(file.folder_id))
      .map((file) => file.storage_path)
    if (paths.length) {
      await supabase.storage.from("drive-files").remove(paths)
    }

    const { error } = await supabase.from("folders").delete().eq("id", folderId)
    if (error) return { error: error.message }
    revalidateDrive(parentId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete folder." }
  }
}

export async function uploadDriveFiles(
  folderId: string | null,
  formData: FormData
) {
  try {
    const { profile, supabase } = await requireStaff()
    const rawFiles = formData.getAll("files")
    const files = rawFiles.filter(
      (item): item is File => item instanceof File && item.size > 0
    )

    if (!files.length) return { error: "Choose at least one file." }

    const incoming = files.reduce((sum, file) => sum + file.size, 0)
    const room = await assertStorageRoom(incoming)
    if (room.error) return room

    if (isLocalMode() || !supabase) {
      for (const file of files) {
        if (file.size > DRIVE_MAX_BYTES) {
          return { error: `${file.name} is over 25 MB.` }
        }
      }
      await uploadLocalDriveFiles(folderId, profile.id, files)
      revalidateDrive(folderId)
      return { success: true }
    }

    for (const file of files) {
      if (file.size > DRIVE_MAX_BYTES) {
        return { error: `${file.name} is over 25 MB.` }
      }

      const path = drivePath(folderId, file.name)
      const { error: uploadError } = await supabase.storage
        .from("drive-files")
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        return { error: `Could not upload ${file.name}: ${uploadError.message}` }
      }

      const { error } = await supabase.from("files").insert({
        folder_id: folderId,
        name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: profile.id,
      })

      if (error) return { error: error.message }
    }

    revalidateDrive(folderId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload." }
  }
}

export async function renameFile(fileId: string, name: string) {
  try {
    const { supabase } = await requireStaff()
    const trimmed = name.trim()
    if (!trimmed) return { error: "File name is required." }
    if (isLocalMode() || !supabase) {
      await renameLocalFile(fileId, trimmed)
      revalidatePath("/drive")
      return { success: true }
    }
    const { error } = await supabase
      .from("files")
      .update({ name: trimmed })
      .eq("id", fileId)
    if (error) return { error: error.message }
    revalidatePath("/drive")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not rename." }
  }
}

export async function moveFile(fileId: string, folderId: string | null) {
  try {
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await moveLocalFile(fileId, folderId)
      revalidatePath("/drive")
      if (folderId) revalidatePath(`/drive/${folderId}`)
      return { success: true }
    }
    const { error } = await supabase
      .from("files")
      .update({ folder_id: folderId })
      .eq("id", fileId)
    if (error) return { error: error.message }
    revalidatePath("/drive")
    if (folderId) revalidatePath(`/drive/${folderId}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not move." }
  }
}

export async function deleteFile(fileId: string, folderId: string | null) {
  try {
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await deleteLocalFile(fileId)
      revalidateDrive(folderId)
      return { success: true }
    }
    const { data: file, error: lookupError } = await supabase
      .from("files")
      .select("storage_path")
      .eq("id", fileId)
      .single()

    if (lookupError || !file) {
      return { error: "File not found." }
    }

    await supabase.storage.from("drive-files").remove([file.storage_path])
    const { error } = await supabase.from("files").delete().eq("id", fileId)
    if (error) return { error: error.message }
    revalidateDrive(folderId)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete." }
  }
}

export async function getDriveDownloadUrl(fileId: string) {
  try {
    const { supabase } = await requireProfile()
    if (isLocalMode() || !supabase) {
      const file = await getLocalFile(fileId)
      if (!file) return { error: "File not found." }
      return {
        url: `/api/local-file?p=${encodeURIComponent(file.storage_path)}&download=1`,
      }
    }
    const { data: file, error } = await supabase
      .from("files")
      .select("storage_path, name")
      .eq("id", fileId)
      .single()

    if (error || !file) return { error: "File not found." }

    const { data, error: signError } = await supabase.storage
      .from("drive-files")
      .createSignedUrl(file.storage_path, 60, { download: file.name })

    if (signError || !data?.signedUrl) {
      return { error: signError?.message || "Could not create download link." }
    }

    return { url: data.signedUrl }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not download." }
  }
}

export async function getDrivePreviewUrl(fileId: string) {
  try {
    const { supabase } = await requireProfile()
    if (isLocalMode() || !supabase) {
      const file = await getLocalFile(fileId)
      if (!file) return { error: "File not found." }
      return { url: `/api/local-file?p=${encodeURIComponent(file.storage_path)}` }
    }
    const { data: file, error } = await supabase
      .from("files")
      .select("storage_path")
      .eq("id", fileId)
      .single()

    if (error || !file) return { error: "File not found." }

    const { data, error: signError } = await supabase.storage
      .from("drive-files")
      .createSignedUrl(file.storage_path, 120)

    if (signError || !data?.signedUrl) {
      return { error: signError?.message || "Could not preview." }
    }

    return { url: data.signedUrl }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not preview." }
  }
}
