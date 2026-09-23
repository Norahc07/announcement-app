"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderPlus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getDriveDownloadUrl,
  getDrivePreviewUrl,
  moveFile,
  renameFile,
  renameFolder,
  uploadDriveFiles,
} from "@/lib/actions/drive"
import { StorageMeter } from "@/components/admin/storage-panel"
import { isAdmin, isStaff } from "@/lib/constants"
import { ExplorerThumb, FolderIcon } from "@/components/drive/explorer-icon"
import { fileKind } from "@/lib/drive-kind"
import { prepareUploadFiles } from "@/lib/image-compress"
import { formatBytes, fromNow } from "@/lib/format"
import type { DriveFile, DriveFolder, Profile } from "@/lib/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ViewMode = "list" | "icons"

type DialogMode =
  | { type: "folder" }
  | { type: "rename-folder"; folder: DriveFolder }
  | { type: "rename-file"; file: DriveFile }
  | { type: "move-file"; file: DriveFile }
  | { type: "preview"; file: DriveFile; url: string }
  | null

const VIEW_KEY = "staff-board-drive-view"

export function FileBrowser({
  profile,
  folderId,
  folderName,
  breadcrumbs,
  folders,
  files,
  allFolders,
  storageUsage,
}: {
  profile: Profile
  folderId: string | null
  folderName: string
  breadcrumbs: DriveFolder[]
  folders: DriveFolder[]
  files: DriveFile[]
  allFolders: DriveFolder[]
  storageUsage?: { usedBytes: number; quotaBytes: number }
}) {
  const staff = isStaff(profile.role)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<ViewMode>("icons")
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [name, setName] = useState("")
  const [moveTo, setMoveTo] = useState<string>("root")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "icons") setView(saved)
  }, [])

  function changeView(next: ViewMode) {
    setView(next)
    window.localStorage.setItem(VIEW_KEY, next)
  }

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((folder) => folder.name.toLowerCase().includes(q))
  }, [folders, query])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((file) => file.name.toLowerCase().includes(q))
  }, [files, query])

  function openFolderDialog() {
    setName("")
    setDialog({ type: "folder" })
  }

  function submitName() {
    startTransition(async () => {
      if (!dialog) return
      let result
      if (dialog.type === "folder") {
        result = await createFolder(folderId, name)
      } else if (dialog.type === "rename-folder") {
        result = await renameFolder(dialog.folder.id, name)
      } else if (dialog.type === "rename-file") {
        result = await renameFile(dialog.file.id, name)
      }
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setDialog(null)
      toast.success("Saved.")
    })
  }

  function submitMove() {
    if (dialog?.type !== "move-file") return
    startTransition(async () => {
      const result = await moveFile(
        dialog.file.id,
        moveTo === "root" ? null : moveTo
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDialog(null)
      toast.success("File moved.")
    })
  }

  function onUpload(fileList: FileList | null) {
    if (!fileList?.length) return
    startTransition(async () => {
      const files = await prepareUploadFiles(Array.from(fileList))
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))
      const result = await uploadDriveFiles(folderId, formData)
      if ("error" in result && result.error) toast.error(result.error)
      else toast.success("Uploaded. Teachers can download this anytime.")
    })
  }

  async function download(file: DriveFile) {
    const result = await getDriveDownloadUrl(file.id)
    if (result.error || !result.url) {
      toast.error(result.error || "Could not download.")
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  async function preview(file: DriveFile) {
    const kind = fileKind(file)
    if (kind === "image" || kind === "video" || kind === "pdf") {
      const url =
        file.preview_url ||
        (await getDrivePreviewUrl(file.id)).url
      if (!url) {
        toast.error("Could not preview.")
        return
      }
      setDialog({ type: "preview", file, url })
      return
    }
    await download(file)
  }

  function folderMenu(folder: DriveFolder) {
    if (!staff) return null
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setName(folder.name)
              setDialog({ type: "rename-folder", folder })
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              if (
                !confirm(`Delete “${folder.name}” and everything inside it?`)
              )
                return
              startTransition(async () => {
                const result = await deleteFolder(folder.id, folderId)
                if (result.error) toast.error(result.error)
              })
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function fileMenu(file: DriveFile, includeDownload = false) {
    const hasMenu = !includeDownload || staff
    return (
      <div className="flex items-center gap-1">
        {includeDownload ? (
          <Button variant="outline" size="sm" onClick={() => download(file)}>
            <Download data-icon="inline-start" />
            Download
          </Button>
        ) : null}
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!includeDownload ? (
                <DropdownMenuItem onClick={() => download(file)}>
                  Download
                </DropdownMenuItem>
              ) : null}
              {staff ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setName(file.name)
                      setDialog({ type: "rename-file", file })
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setMoveTo(file.folder_id ?? "root")
                      setDialog({ type: "move-file", file })
                    }}
                  >
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      if (!confirm(`Delete “${file.name}”?`)) return
                      startTransition(async () => {
                        const result = await deleteFile(file.id, folderId)
                        if (result.error) toast.error(result.error)
                        else toast.success("File removed.")
                      })
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }

  const parentFolder =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null
  const backHref = parentFolder ? `/drive/${parentFolder.id}` : "/drive"
  const backLabel = parentFolder ? parentFolder.name : "Resources"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {folderId ? (
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-2 mb-1"
              )}
            >
              <ChevronLeft data-icon="inline-start" />
              Back to {backLabel}
            </Link>
          ) : null}
          <h1 className="font-heading text-2xl">{folderName}</h1>
          <nav className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/drive" className="hover:text-foreground">
              Resources
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" />
                <Link href={`/drive/${crumb.id}`} className="hover:text-foreground">
                  {crumb.name}
                </Link>
              </span>
            ))}
          </nav>
          {storageUsage && isAdmin(profile.role) ? (
            <div className="mt-3 max-w-sm">
              <StorageMeter
                usedBytes={storageUsage.usedBytes}
                quotaBytes={storageUsage.quotaBytes}
                compact
              />
            </div>
          ) : null}
        </div>
        {staff ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openFolderDialog}>
              <FolderPlus data-icon="inline-start" />
              New folder
            </Button>
            <Button size="lg" className="relative">
              <Upload data-icon="inline-start" />
              {pending ? "Uploading…" : "Upload"}
              <input
                type="file"
                multiple
                disabled={pending}
                onChange={(event) => {
                  onUpload(event.target.files)
                  event.target.value = ""
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Download anything you need. Files can only be removed by Ma&apos;am
            Lorna or the AO.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search in this folder"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex shrink-0 rounded-lg border bg-card p-0.5">
          <Button
            type="button"
            size="icon"
            variant={view === "list" ? "secondary" : "ghost"}
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            <List />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={view === "icons" ? "secondary" : "ghost"}
            aria-label="Icons view"
            aria-pressed={view === "icons"}
            onClick={() => changeView("icons")}
          >
            <LayoutGrid />
          </Button>
        </div>
      </div>

      {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <div className="mx-auto flex justify-center">
            <FolderIcon large />
          </div>
          <h2 className="font-heading mt-4 text-xl">
            {query ? "No matching files" : "This folder is empty"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Reading materials and other resources live here. Teachers can
            download them; only Ma&apos;am Lorna and the AO can upload or delete.
          </p>
        </div>
      ) : view === "icons" ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] gap-x-1 gap-y-2">
          {filteredFolders.map((folder) => (
            <li key={folder.id} className="group relative">
              <div className="absolute top-0.5 right-0 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                {folderMenu(folder)}
              </div>
              <Link
                href={`/drive/${folder.id}`}
                title={folder.name}
                className="flex h-[8.75rem] flex-col items-center rounded-sm px-1 pt-2 pb-1 text-center hover:bg-[#cce8ff] focus-visible:bg-[#cce8ff] dark:hover:bg-primary/15 dark:focus-visible:bg-primary/15"
              >
                <FolderIcon large />
                <span className="mt-1 line-clamp-2 w-full px-0.5 text-[12px] leading-tight break-words">
                  {folder.name}
                </span>
              </Link>
            </li>
          ))}
          {filteredFiles.map((file) => (
            <li key={file.id} className="group relative">
              <div className="absolute top-0.5 right-0 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                {fileMenu(file)}
              </div>
              <button
                type="button"
                title={file.name}
                onClick={() => preview(file)}
                className="flex h-[8.75rem] w-full flex-col items-center rounded-sm px-1 pt-2 pb-1 text-center hover:bg-[#cce8ff] focus-visible:bg-[#cce8ff] dark:hover:bg-primary/15 dark:focus-visible:bg-primary/15"
              >
                <ExplorerThumb file={file} large />
                <span className="mt-1 line-clamp-2 w-full px-0.5 text-[12px] leading-tight break-words">
                  {file.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/8">
          <ul className="divide-y">
            {filteredFolders.map((folder) => (
              <li
                key={folder.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <Link
                  href={`/drive/${folder.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <FolderIcon />
                  <span className="truncate font-medium">{folder.name}</span>
                </Link>
                {folderMenu(folder)}
              </li>
            ))}
            {filteredFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <button
                  type="button"
                  onClick={() => preview(file)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ExplorerThumb file={file} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.size_bytes)} · {fromNow(file.created_at)}
                    </span>
                  </span>
                </button>
                {fileMenu(file, true)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={dialog !== null && dialog.type !== "preview"}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          {dialog?.type === "move-file" ? (
            <>
              <DialogHeader>
                <DialogTitle>Move {dialog.file.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="destination">Folder</Label>
                <select
                  id="destination"
                  value={moveTo}
                  onChange={(event) => setMoveTo(event.target.value)}
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="root">Resources (root)</option>
                  {allFolders
                    .filter((folder) => folder.id !== folderId)
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                </select>
              </div>
              <DialogFooter>
                <Button onClick={submitMove} disabled={pending}>
                  Move
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialog?.type === "folder"
                    ? "New folder"
                    : dialog?.type === "rename-folder"
                      ? "Rename folder"
                      : "Rename file"}
                </DialogTitle>
              </DialogHeader>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                autoFocus
              />
              <DialogFooter>
                <Button onClick={submitName} disabled={pending || !name.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === "preview"}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          {dialog?.type === "preview" ? (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">{dialog.file.name}</DialogTitle>
              </DialogHeader>
              {fileKind(dialog.file) === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dialog.url}
                  alt={dialog.file.name}
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : fileKind(dialog.file) === "video" ? (
                <video
                  src={dialog.url}
                  controls
                  className="max-h-[70vh] w-full rounded-lg bg-black"
                />
              ) : (
                <iframe
                  title={dialog.file.name}
                  src={dialog.url}
                  className="h-[70vh] w-full rounded-lg bg-muted"
                />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
