import { promises as fs } from "fs"
import path from "path"
import {
  ADMIN_PASSWORD,
  ADMIN_USER_ID,
  ADMIN_USERNAME,
} from "@/lib/local/mode"
import type {
  Announcement,
  AnnouncementAttachment,
  CalendarEvent,
  Comment,
  DriveFile,
  DriveFolder,
  Profile,
  Reaction,
  ReactionType,
  Role,
} from "@/lib/types"

export type LocalUser = Profile & {
  username: string
  password: string
}

export type LocalAnnouncement = {
  id: string
  author_id: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export type LocalComment = {
  id: string
  announcement_id: string
  author_id: string
  body: string
  created_at: string
  updated_at?: string | null
}

export type AppSettings = {
  last_export_at: string | null
}

export type Store = {
  users: LocalUser[]
  announcements: LocalAnnouncement[]
  attachments: AnnouncementAttachment[]
  comments: LocalComment[]
  reactions: Reaction[]
  events: CalendarEvent[]
  folders: DriveFolder[]
  files: DriveFile[]
  settings: AppSettings
}

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "staff-board-data")
  : path.join(process.cwd(), "data")
const STORE_PATH = path.join(DATA_DIR, "store.json")
const UPLOAD_DIR = path.join(DATA_DIR, "uploads")

function nowIso() {
  return new Date().toISOString()
}

function emptyStore(): Store {
  return {
    users: [
      {
        id: ADMIN_USER_ID,
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        full_name: "Ma'am Lorna",
        email: "admin",
        role: "admin",
        must_change_password: false,
        created_at: nowIso(),
      },
    ],
    announcements: [],
    attachments: [],
    comments: [],
    reactions: [],
    events: [],
    folders: [],
    files: [],
    settings: { last_export_at: null },
  }
}

let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(work: () => Promise<T>) {
  const run = queue.then(work, work)
  queue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8")
    const parsed = JSON.parse(raw) as Partial<Store>
    return {
      ...emptyStore(),
      ...parsed,
      settings: { ...emptyStore().settings, ...parsed.settings },
    }
  } catch {
    const store = emptyStore()
    try {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2))
    } catch {
      // Vercel cwd is read-only; keep the seeded admin user in memory.
    }
    return store
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2))
}

export async function withStore<T>(
  fn: (store: Store) => T | Promise<T>,
  mutate = false
) {
  return enqueue(async () => {
    const store = await readStore()
    const result = await fn(store)
    if (mutate) await writeStore(store)
    return result
  })
}

export function toProfile(user: LocalUser): Profile {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    must_change_password: user.must_change_password,
    created_at: user.created_at,
  }
}

function authorOf(store: Store, id: string) {
  const user = store.users.find((item) => item.id === id)
  if (!user) return null
  return { id: user.id, full_name: user.full_name, role: user.role }
}

function hydrateAnnouncement(store: Store, row: LocalAnnouncement): Announcement {
  return {
    ...row,
    author: authorOf(store, row.author_id),
    attachments: store.attachments
      .filter((item) => item.announcement_id === row.id)
      .map((item) => ({
        ...item,
        url: `/api/local-file?p=${encodeURIComponent(item.storage_path)}`,
      })),
    comments: store.comments
      .filter((item) => item.announcement_id === row.id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((item) => ({
        ...item,
        author: authorOf(store, item.author_id),
      })),
    reactions: store.reactions.filter((item) => item.announcement_id === row.id),
  }
}

export async function saveUpload(kind: "announcements" | "drive", file: File) {
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
  const rel = `${kind}/${crypto.randomUUID()}-${safeName}`
  const abs = path.join(UPLOAD_DIR, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()))
  return rel
}

export function uploadAbsPath(storagePath: string) {
  const normalized = path.normalize(storagePath).replace(/^[/\\]+/, "")
  if (normalized.includes("..")) return null
  return path.join(UPLOAD_DIR, normalized)
}

export async function removeUpload(storagePath: string) {
  const abs = uploadAbsPath(storagePath)
  if (!abs) return
  await fs.unlink(abs).catch(() => undefined)
}

export async function findUserByLogin(username: string) {
  return withStore((store) => {
    const key = username.trim().toLowerCase()
    return (
      store.users.find(
        (user) =>
          user.username.toLowerCase() === key || user.email.toLowerCase() === key
      ) ?? null
    )
  })
}

export async function findUserById(id: string) {
  return withStore((store) => store.users.find((user) => user.id === id) ?? null)
}

export async function listProfiles(): Promise<Profile[]> {
  return withStore((store) =>
    store.users
      .map(toProfile)
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
}

export async function createLocalUser(input: {
  fullName: string
  email: string
  password: string
  role: Role
}) {
  return withStore((store) => {
    const email = input.email.trim().toLowerCase()
    if (store.users.some((user) => user.email.toLowerCase() === email || user.username.toLowerCase() === email)) {
      throw new Error("That username or email is already in use.")
    }
    const user: LocalUser = {
      id: crypto.randomUUID(),
      username: email,
      password: input.password,
      full_name: input.fullName,
      email,
      role: input.role,
      must_change_password: true,
      created_at: nowIso(),
    }
    store.users.push(user)
    return toProfile(user)
  }, true)
}

export async function updateLocalUser(
  userId: string,
  patch: Partial<Pick<LocalUser, "full_name" | "role" | "password" | "must_change_password">>
) {
  return withStore((store) => {
    const user = store.users.find((item) => item.id === userId)
    if (!user) throw new Error("User not found.")
    Object.assign(user, patch)
    return toProfile(user)
  }, true)
}

export async function deleteLocalUser(userId: string) {
  return withStore((store) => {
    store.users = store.users.filter((user) => user.id !== userId)
  }, true)
}

export async function listAnnouncements(): Promise<Announcement[]> {
  return withStore((store) =>
    [...store.announcements]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
      .map((row) => hydrateAnnouncement(store, row))
  )
}

export async function getLocalAnnouncement(id: string): Promise<Announcement | null> {
  return withStore((store) => {
    const row = store.announcements.find((item) => item.id === id)
    return row ? hydrateAnnouncement(store, row) : null
  })
}

export async function createLocalAnnouncement(input: {
  authorId: string
  body: string
  pinned: boolean
  files: File[]
}) {
  const attachments: AnnouncementAttachment[] = []
  for (const file of input.files) {
    const storagePath = await saveUpload("announcements", file)
    attachments.push({
      id: crypto.randomUUID(),
      announcement_id: "",
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
  }

  return withStore((store) => {
    const id = crypto.randomUUID()
    const stamp = nowIso()
    store.announcements.unshift({
      id,
      author_id: input.authorId,
      body: input.body,
      pinned: input.pinned,
      created_at: stamp,
      updated_at: stamp,
    })
    for (const attachment of attachments) {
      store.attachments.push({ ...attachment, announcement_id: id })
    }
    return id
  }, true)
}

export async function updateLocalAnnouncement(id: string, body: string) {
  return withStore((store) => {
    const row = store.announcements.find((item) => item.id === id)
    if (!row) throw new Error("Announcement not found.")
    row.body = body
    row.updated_at = nowIso()
  }, true)
}

export async function toggleLocalPin(id: string, pinned: boolean) {
  return withStore((store) => {
    const row = store.announcements.find((item) => item.id === id)
    if (!row) throw new Error("Announcement not found.")
    row.pinned = pinned
    row.updated_at = nowIso()
  }, true)
}

export async function deleteLocalAnnouncement(id: string) {
  const paths = await withStore((store) => {
    const paths = store.attachments
      .filter((item) => item.announcement_id === id)
      .map((item) => item.storage_path)
    store.announcements = store.announcements.filter((item) => item.id !== id)
    store.attachments = store.attachments.filter((item) => item.announcement_id !== id)
    store.comments = store.comments.filter((item) => item.announcement_id !== id)
    store.reactions = store.reactions.filter((item) => item.announcement_id !== id)
    return paths
  }, true)
  await Promise.all(paths.map((item) => removeUpload(item)))
}

export async function setLocalReaction(
  announcementId: string,
  userId: string,
  type: ReactionType | null
) {
  return withStore((store) => {
    store.reactions = store.reactions.filter(
      (item) => !(item.announcement_id === announcementId && item.user_id === userId)
    )
    if (type) {
      store.reactions.push({ announcement_id: announcementId, user_id: userId, type })
    }
  }, true)
}

export async function addLocalComment(
  announcementId: string,
  authorId: string,
  body: string
) {
  return withStore((store) => {
    store.comments.push({
      id: crypto.randomUUID(),
      announcement_id: announcementId,
      author_id: authorId,
      body,
      created_at: nowIso(),
    })
  }, true)
}

export async function updateLocalComment(
  commentId: string,
  authorId: string,
  body: string
) {
  return withStore((store) => {
    const row = store.comments.find((item) => item.id === commentId)
    if (!row) throw new Error("Comment not found.")
    if (row.author_id !== authorId) {
      throw new Error("You can only edit your own comment.")
    }
    row.body = body
    row.updated_at = nowIso()
  }, true)
}

export async function deleteLocalComment(
  commentId: string,
  userId: string,
  staff: boolean
) {
  return withStore((store) => {
    const row = store.comments.find((item) => item.id === commentId)
    if (!row) throw new Error("Comment not found.")
    if (row.author_id !== userId && !staff) {
      throw new Error("You can only delete your own comment.")
    }
    store.comments = store.comments.filter((item) => item.id !== commentId)
  }, true)
}

export async function listEvents(): Promise<CalendarEvent[]> {
  return withStore((store) =>
    [...store.events]
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((event) => ({
        ...event,
        creator: authorOf(store, event.created_by),
      }))
  )
}

export async function createLocalEvent(event: Omit<CalendarEvent, "id" | "created_at" | "creator">) {
  return withStore((store) => {
    store.events.push({
      ...event,
      id: crypto.randomUUID(),
      created_at: nowIso(),
    })
  }, true)
}

export async function updateLocalEvent(
  eventId: string,
  patch: Pick<CalendarEvent, "title" | "description" | "starts_at" | "ends_at">
) {
  return withStore((store) => {
    const row = store.events.find((item) => item.id === eventId)
    if (!row) throw new Error("Event not found.")
    Object.assign(row, patch)
  }, true)
}

export async function deleteLocalEvent(eventId: string) {
  return withStore((store) => {
    store.events = store.events.filter((item) => item.id !== eventId)
  }, true)
}

export async function listFolders(): Promise<DriveFolder[]> {
  return withStore((store) =>
    [...store.folders].sort((a, b) => a.name.localeCompare(b.name))
  )
}

export async function getLocalFolder(id: string) {
  return withStore((store) => store.folders.find((item) => item.id === id) ?? null)
}

export async function folderChildren(parentId: string | null) {
  return withStore((store) => {
    const folders = store.folders
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
    const files = store.files
      .filter((item) => item.folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({
        ...file,
        uploader: authorOf(store, file.uploaded_by),
        preview_url: `/api/local-file?p=${encodeURIComponent(file.storage_path)}`,
      }))
    return { folders, files }
  })
}

export async function createLocalFolder(
  parentId: string | null,
  name: string,
  createdBy: string
) {
  return withStore((store) => {
    store.folders.push({
      id: crypto.randomUUID(),
      name,
      parent_id: parentId,
      created_by: createdBy,
      created_at: nowIso(),
    })
  }, true)
}

export async function renameLocalFolder(folderId: string, name: string) {
  return withStore((store) => {
    const row = store.folders.find((item) => item.id === folderId)
    if (!row) throw new Error("Folder not found.")
    row.name = name
  }, true)
}

export async function deleteLocalFolder(folderId: string) {
  const paths = await withStore((store) => {
    const ids = new Set<string>([folderId])
    let added = true
    while (added) {
      added = false
      for (const folder of store.folders) {
        if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
          ids.add(folder.id)
          added = true
        }
      }
    }
    const paths = store.files
      .filter((file) => file.folder_id && ids.has(file.folder_id))
      .map((file) => file.storage_path)
    store.folders = store.folders.filter((folder) => !ids.has(folder.id))
    store.files = store.files.filter(
      (file) => !(file.folder_id && ids.has(file.folder_id))
    )
    return paths
  }, true)
  await Promise.all(paths.map((item) => removeUpload(item)))
}

export async function uploadLocalDriveFiles(
  folderId: string | null,
  uploadedBy: string,
  files: File[]
) {
  const saved: DriveFile[] = []
  for (const file of files) {
    const storagePath = await saveUpload("drive", file)
    saved.push({
      id: crypto.randomUUID(),
      folder_id: folderId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
      created_at: nowIso(),
    })
  }
  return withStore((store) => {
    store.files.push(...saved)
  }, true)
}

export async function renameLocalFile(fileId: string, name: string) {
  return withStore((store) => {
    const row = store.files.find((item) => item.id === fileId)
    if (!row) throw new Error("File not found.")
    row.name = name
  }, true)
}

export async function moveLocalFile(fileId: string, folderId: string | null) {
  return withStore((store) => {
    const row = store.files.find((item) => item.id === fileId)
    if (!row) throw new Error("File not found.")
    row.folder_id = folderId
  }, true)
}

export async function deleteLocalFile(fileId: string) {
  const storagePath = await withStore((store) => {
    const row = store.files.find((item) => item.id === fileId)
    if (!row) throw new Error("File not found.")
    store.files = store.files.filter((item) => item.id !== fileId)
    return row.storage_path
  }, true)
  await removeUpload(storagePath)
}

export async function getLocalFile(fileId: string) {
  return withStore((store) => store.files.find((item) => item.id === fileId) ?? null)
}

export async function getLocalStorageUsage() {
  return withStore((store) => {
    const driveBytes = store.files.reduce((sum, file) => sum + (file.size_bytes || 0), 0)
    const announcementBytes = store.attachments.reduce(
      (sum, file) => sum + (file.size_bytes || 0),
      0
    )
    return {
      driveBytes,
      announcementBytes,
      usedBytes: driveBytes + announcementBytes,
      fileCount: store.files.length,
      attachmentCount: store.attachments.length,
      lastExportAt: store.settings.last_export_at,
    }
  })
}

export async function getLocalExportPayload() {
  return withStore((store) => ({
    exported_at: nowIso(),
    users: store.users.map((user) => ({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    })),
    announcements: store.announcements,
    attachments: store.attachments.map(({ storage_path, ...rest }) => ({
      ...rest,
      storage_path,
    })),
    comments: store.comments,
    reactions: store.reactions,
    events: store.events,
    folders: store.folders,
    files: store.files,
  }))
}

export async function markLocalExported(_userId: string) {
  return withStore((store) => {
    store.settings.last_export_at = nowIso()
    return store.settings.last_export_at
  }, true)
}

export async function countLocalBefore(cutoffIso: string) {
  return withStore((store) => ({
    announcements: store.announcements.filter((item) => item.created_at < cutoffIso).length,
    files: store.files.filter((item) => item.created_at < cutoffIso).length,
    events: store.events.filter((item) => item.starts_at < cutoffIso).length,
  }))
}

export async function deleteLocalBefore(cutoffIso: string) {
  const paths = await withStore((store) => {
    const announcementIds = new Set(
      store.announcements
        .filter((item) => item.created_at < cutoffIso)
        .map((item) => item.id)
    )
    const attachmentPaths = store.attachments
      .filter((item) => announcementIds.has(item.announcement_id))
      .map((item) => item.storage_path)
    const filePaths = store.files
      .filter((item) => item.created_at < cutoffIso)
      .map((item) => item.storage_path)

    store.announcements = store.announcements.filter((item) => item.created_at >= cutoffIso)
    store.attachments = store.attachments.filter(
      (item) => !announcementIds.has(item.announcement_id)
    )
    store.comments = store.comments.filter(
      (item) => !announcementIds.has(item.announcement_id)
    )
    store.reactions = store.reactions.filter(
      (item) => !announcementIds.has(item.announcement_id)
    )
    store.events = store.events.filter((item) => item.starts_at >= cutoffIso)
    store.files = store.files.filter((item) => item.created_at >= cutoffIso)
    return [...attachmentPaths, ...filePaths]
  }, true)
  await Promise.all(paths.map((item) => removeUpload(item)))
  return paths.length
}
