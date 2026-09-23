import { isSupabaseConfigured } from "@/lib/constants"

export function isLocalMode() {
  // Username/password login (admin / admin123) is the default on Vercel too.
  // Supabase auth is opt-in so a pasted project URL cannot block that login.
  const useSupabase =
    process.env.NEXT_PUBLIC_STAFF_BOARD_USE_SUPABASE === "1" ||
    process.env.NEXT_PUBLIC_STAFF_BOARD_USE_SUPABASE === "true"
  return !useSupabase || !isSupabaseConfigured()
}

export const SESSION_COOKIE = "staff_board_session"
export const ADMIN_USERNAME = "admin"
export const ADMIN_PASSWORD = "admin123"
export const ADMIN_USER_ID = "user-admin"
