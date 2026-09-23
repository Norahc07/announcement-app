"use server"

import { revalidatePath } from "next/cache"
import { updateLocalUser } from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { requireProfile } from "@/lib/supabase/server"

export async function updateProfileName(fullName: string) {
  try {
    const { profile, supabase } = await requireProfile()
    const trimmed = fullName.trim()
    if (!trimmed) return { error: "Name is required." }

    if (isLocalMode() || !supabase) {
      await updateLocalUser(profile.id, { full_name: trimmed })
      revalidatePath("/", "layout")
      return { success: true }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", profile.id)

    if (error) return { error: error.message }
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update name." }
  }
}

export async function changePassword(formData: FormData) {
  try {
    const { profile, supabase } = await requireProfile()
    const password = String(formData.get("password") || "")
    const confirm = String(formData.get("confirm") || "")

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." }
    }
    if (password !== confirm) {
      return { error: "Passwords do not match." }
    }

    if (isLocalMode() || !supabase) {
      await updateLocalUser(profile.id, {
        password,
        must_change_password: false,
      })
      revalidatePath("/", "layout")
      return { success: true }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }

    if (profile.must_change_password) {
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", profile.id)
    }

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not change password." }
  }
}
