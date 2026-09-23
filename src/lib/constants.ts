import type { ReactionType, Role } from "@/lib/types"

export const APP_NAME = "Staff Board"
export const APP_TAGLINE = "Announcements, calendar, and resources — without the group chat pile-up."

export const REACTIONS: { type: ReactionType; label: string; emoji: string }[] = [
  { type: "like", label: "Like", emoji: "👍" },
  { type: "heart", label: "Love", emoji: "❤️" },
  { type: "wow", label: "Wow", emoji: "😮" },
  { type: "haha", label: "Haha", emoji: "😂" },
  { type: "angry", label: "Angry", emoji: "😠" },
  { type: "important", label: "Important", emoji: "❗" },
]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Principal",
  ao: "AO",
  teacher: "Teacher",
}

export const DRIVE_MAX_BYTES = 25 * 1024 * 1024
export const ANNOUNCEMENT_MAX_BYTES = 10 * 1024 * 1024
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

export function isStaff(role: Role) {
  return role === "admin" || role === "ao"
}

export function isAdmin(role: Role) {
  return role === "admin"
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
