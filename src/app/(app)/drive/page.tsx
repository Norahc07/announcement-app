import { FileBrowser } from "@/components/drive/file-browser"
import { isAdmin } from "@/lib/constants"
import { cachedStorageUsage } from "@/lib/data/cached"
import {
  breadcrumbsFor,
  getFolderChildren,
  getFolders,
} from "@/lib/data/drive"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function DrivePage() {
  const profile = await getSessionProfile()
  if (!profile) return null

  const [allFolders, children, usage] = await Promise.all([
    getFolders(),
    getFolderChildren(null),
    isAdmin(profile.role) ? cachedStorageUsage().catch(() => null) : null,
  ])

  return (
    <FileBrowser
      profile={profile}
      folderId={null}
      folderName="Resources"
      breadcrumbs={breadcrumbsFor(null, allFolders)}
      folders={children.folders}
      files={children.files}
      allFolders={allFolders}
      storageUsage={usage ?? undefined}
    />
  )
}
