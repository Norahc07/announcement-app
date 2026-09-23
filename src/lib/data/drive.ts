import { createClient } from "@/lib/supabase/server"
import { isLocalMode } from "@/lib/local/mode"
import { fileKind } from "@/lib/drive-kind"
import {
  folderChildren,
  getLocalFolder,
  listFolders,
} from "@/lib/local/db"
import type { DriveFile, DriveFolder } from "@/lib/types"

export async function getFolders(): Promise<DriveFolder[]> {
  if (isLocalMode()) return listFolders()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as DriveFolder[]
}

export async function getFolder(id: string): Promise<DriveFolder | null> {
  if (isLocalMode()) return getLocalFolder(id)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return (data as DriveFolder | null) ?? null
}

export async function getFolderChildren(parentId: string | null) {
  if (isLocalMode()) return folderChildren(parentId)

  const supabase = await createClient()

  let foldersQuery = supabase
    .from("folders")
    .select("*")
    .order("name", { ascending: true })
  foldersQuery = parentId
    ? foldersQuery.eq("parent_id", parentId)
    : foldersQuery.is("parent_id", null)

  let filesQuery = supabase
    .from("files")
    .select(
      `
      *,
        uploader:profiles!uploaded_by (id, full_name)
    `
    )
    .order("name", { ascending: true })
  filesQuery = parentId
    ? filesQuery.eq("folder_id", parentId)
    : filesQuery.is("folder_id", null)

  const [{ data: folders, error: folderError }, { data: fileRows, error: fileError }] =
    await Promise.all([foldersQuery, filesQuery])

  if (folderError) throw folderError
  if (fileError) throw fileError

  const listed = (fileRows ?? []) as DriveFile[]
  const withPreview = await Promise.all(
    listed.map(async (file) => {
      const kind = fileKind(file)
      if (kind !== "image" && kind !== "video") return file
      const { data } = await supabase.storage
        .from("drive-files")
        .createSignedUrl(file.storage_path, 3600)
      return { ...file, preview_url: data?.signedUrl }
    })
  )

  return {
    folders: (folders ?? []) as DriveFolder[],
    files: withPreview,
  }
}

export function breadcrumbsFor(
  folderId: string | null,
  folders: DriveFolder[]
): DriveFolder[] {
  if (!folderId) return []
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const trail: DriveFolder[] = []
  let current = byId.get(folderId) ?? null
  while (current) {
    trail.unshift(current)
    current = current.parent_id ? (byId.get(current.parent_id) ?? null) : null
  }
  return trail
}

export async function searchDrive(query: string) {
  const supabase = await createClient()
  const term = `%${query.trim()}%`

  const [{ data: folders }, { data: files }] = await Promise.all([
    supabase.from("folders").select("*").ilike("name", term).order("name"),
    supabase
      .from("files")
      .select(
        `
        *,
        uploader:profiles!uploaded_by (id, full_name)
      `
      )
      .ilike("name", term)
      .order("name"),
  ])

  return {
    folders: (folders ?? []) as DriveFolder[],
    files: (files ?? []) as DriveFile[],
  }
}
