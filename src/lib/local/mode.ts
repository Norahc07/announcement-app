import { isSupabaseConfigured } from "@/lib/constants"

export function isLocalMode() {
  return !isSupabaseConfigured()
}

export const SESSION_COOKIE = "staff_board_session"
export const ADMIN_USERNAME = "admin"
export const ADMIN_PASSWORD = "admin123"
export const ADMIN_USER_ID = "user-admin"
