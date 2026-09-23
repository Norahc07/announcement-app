import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isStaff as roleIsStaff, isAdmin as roleIsAdmin } from "@/lib/constants"
import { findUserById, toProfile } from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { readSession } from "@/lib/local/session"
import type { Profile } from "@/lib/types"

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error("Supabase is not configured.")
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component; middleware will refresh the session.
        }
      },
    },
  })
}

export async function getSessionProfile(): Promise<Profile | null> {
  if (isLocalMode()) {
    const session = await readSession()
    if (!session) return null
    const user = await findUserById(session.id)
    return user ? toProfile(user) : null
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  return (data as Profile | null) ?? null
}

export async function requireProfile() {
  const profile = await getSessionProfile()
  if (!profile) {
    throw new Error("You need to sign in first.")
  }
  return { profile, supabase: isLocalMode() ? null : await createClient() }
}

export async function requireStaff() {
  const ctx = await requireProfile()
  if (!roleIsStaff(ctx.profile.role)) {
    throw new Error("Only Ma'am Lorna and the AO can do this.")
  }
  return ctx
}

export async function requireAdmin() {
  const ctx = await requireProfile()
  if (!roleIsAdmin(ctx.profile.role)) {
    throw new Error("Only the admin can manage accounts.")
  }
  return ctx
}
