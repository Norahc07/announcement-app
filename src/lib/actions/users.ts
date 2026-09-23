"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/supabase/server"
import {
  createLocalUser,
  deleteLocalUser,
  updateLocalUser,
} from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import type { Role } from "@/lib/types"

const ROLES: Role[] = ["admin", "ao", "teacher"]

function revalidateUsers() {
  revalidatePath("/users")
  revalidatePath("/admin/users")
}

export async function createUserAccount(formData: FormData) {
  try {
    await requireAdmin()
    const fullName = String(formData.get("full_name") || "").trim()
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")
    const role = String(formData.get("role") || "teacher") as Role

    if (!fullName || !email || !password) {
      return { error: "Name, email, and a temporary password are required." }
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." }
    }
    if (!ROLES.includes(role) || role === "admin") {
      return { error: "Choose Teacher or AO. There is only one admin account." }
    }

    if (isLocalMode()) {
      await createLocalUser({
        fullName,
        email,
        password,
        role,
      })
      revalidateUsers()
      return { success: true }
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        must_change_password: true,
      },
    })

    if (error) return { error: error.message }
    revalidateUsers()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create account." }
  }
}

export async function updateUserRole(userId: string, role: Role) {
  try {
    const { profile } = await requireAdmin()
    if (userId === profile.id) {
      return { error: "You cannot change your own role." }
    }
    if (!ROLES.includes(role)) return { error: "Invalid role." }

    if (isLocalMode()) {
      await updateLocalUser(userId, { role })
      revalidateUsers()
      return { success: true }
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", userId)

    if (error) return { error: error.message }
    revalidateUsers()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update role." }
  }
}

export async function deleteUserAccount(userId: string) {
  try {
    const { profile } = await requireAdmin()
    if (userId === profile.id) {
      return { error: "You cannot delete your own account." }
    }

    if (isLocalMode()) {
      await deleteLocalUser(userId)
      revalidateUsers()
      return { success: true }
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }
    revalidateUsers()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete account." }
  }
}

export async function resetUserPassword(userId: string, password: string) {
  try {
    await requireAdmin()
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." }
    }

    if (isLocalMode()) {
      await updateLocalUser(userId, { password, must_change_password: true })
      revalidateUsers()
      return { success: true }
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { must_change_password: true },
    })
    if (error) return { error: error.message }

    await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId)

    revalidateUsers()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reset password." }
  }
}
