export type Role = "admin" | "ao" | "teacher"

export type ReactionType =
  | "like"
  | "heart"
  | "wow"
  | "haha"
  | "angry"
  | "important"

export type Profile = {
  id: string
  full_name: string
  email: string
  role: Role
  must_change_password: boolean
  created_at: string
}

export type AnnouncementAttachment = {
  id: string
  announcement_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  url?: string
}

export type Comment = {
  id: string
  announcement_id: string
  author_id: string
  body: string
  created_at: string
  updated_at?: string | null
  author: Pick<Profile, "id" | "full_name" | "role"> | null
}

export type Reaction = {
  announcement_id: string
  user_id: string
  type: ReactionType
}

export type Announcement = {
  id: string
  author_id: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
  author: Pick<Profile, "id" | "full_name" | "role"> | null
  attachments: AnnouncementAttachment[]
  comments: Comment[]
  reactions: Reaction[]
}

export type CalendarEventKind = "school" | "holiday" | "quezon"

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  created_by: string
  created_at: string
  kind?: CalendarEventKind
  creator?: Pick<Profile, "id" | "full_name" | "role"> | null
}

export type DriveFolder = {
  id: string
  name: string
  parent_id: string | null
  created_by: string
  created_at: string
}

export type DriveFile = {
  id: string
  folder_id: string | null
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number
  uploaded_by: string
  created_at: string
  uploader?: Pick<Profile, "id" | "full_name"> | null
  preview_url?: string
}
