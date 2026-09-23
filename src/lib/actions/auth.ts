"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/constants"
import { findUserByLogin } from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { clearSession, writeSession } from "@/lib/local/session"
import { createClient } from "@/lib/supabase/server"

export async function signIn(formData: FormData) {
  const username = String(
    formData.get("username") || formData.get("email") || ""
  ).trim()
  const password = String(formData.get("password") || "")

  if (!username || !password) {
    return { error: "Username and password are required." }
  }

  if (isLocalMode()) {
    const user = await findUserByLogin(username)
    if (!user || user.password !== password) {
      return { error: "Incorrect username or password." }
    }

    await writeSession({ id: user.id, role: user.role })
    revalidatePath("/", "layout")
    redirect("/")
  }

  if (!isSupabaseConfigured()) {
    return { error: "Staff Board is not connected yet." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: username,
    password,
  })

  if (error) {
    return { error: "Incorrect username or password." }
  }

  redirect("/")
}

export async function signOut() {
  if (isLocalMode()) {
    await clearSession()
    revalidatePath("/", "layout")
    redirect("/login")
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
