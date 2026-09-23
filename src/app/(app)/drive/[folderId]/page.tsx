import { notFound } from "next/navigation"
import { FileBrowser } from "@/components/drive/file-browser"
import { isAdmin } from "@/lib/constants"
import { cachedStorageUsage } from "@/lib/data/cached"
import {
  breadcrumbsFor,
  getFolder,
  getFolderChildren,
  getFolders,
} from "@/lib/data/drive"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function DriveFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>
}) {
  const { folderId } = await params
  const profile = await getSessionProfile()
  if (!profile) return null

  const folder = await getFolder(folderId)
  if (!folder) notFound()

  const [allFolders, children, usage] = await Promise.all([
    getFolders(),
    getFolderChildren(folderId),
    isAdmin(profile.role) ? cachedStorageUsage().catch(() => null) : null,
  ])

  return (
    <FileBrowser
      profile={profile}
      folderId={folderId}
      folderName={folder.name}
      breadcrumbs={breadcrumbsFor(folderId, allFolders)}
      folders={children.folders}
      files={children.files}
      allFolders={allFolders}
      storageUsage={usage ?? undefined}
    />
  )
}
