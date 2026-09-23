"use server"

import { revalidatePath } from "next/cache"
import { isBuiltInEvent } from "@/lib/holidays"
import { createLocalEvent, deleteLocalEvent, updateLocalEvent } from "@/lib/local/db"
import { isLocalMode } from "@/lib/local/mode"
import { requireStaff } from "@/lib/supabase/server"

export async function createEvent(formData: FormData) {
  try {
    const { profile, supabase } = await requireStaff()
    const title = String(formData.get("title") || "").trim()
    const description = String(formData.get("description") || "").trim()
    const startsAt = String(formData.get("starts_at") || "")
    const endsAt = String(formData.get("ends_at") || "")

    if (!title) return { error: "Event title is required." }
    if (!startsAt) return { error: "Start date and time are required." }

    if (isLocalMode() || !supabase) {
      await createLocalEvent({
        title,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        created_by: profile.id,
      })
      revalidatePath("/")
      revalidatePath("/calendar")
      return { success: true }
    }

    const { error } = await supabase.from("events").insert({
      title,
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      created_by: profile.id,
    })

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath("/calendar")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create event." }
  }
}

export async function updateEvent(eventId: string, formData: FormData) {
  try {
    if (isBuiltInEvent({ id: eventId })) {
      return { error: "Philippine holidays and Quezon occasions cannot be edited." }
    }
    const { supabase } = await requireStaff()
    const title = String(formData.get("title") || "").trim()
    const description = String(formData.get("description") || "").trim()
    const startsAt = String(formData.get("starts_at") || "")
    const endsAt = String(formData.get("ends_at") || "")

    if (!title) return { error: "Event title is required." }
    if (!startsAt) return { error: "Start date and time are required." }

    if (isLocalMode() || !supabase) {
      await updateLocalEvent(eventId, {
        title,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      })
      revalidatePath("/")
      revalidatePath("/calendar")
      return { success: true }
    }

    const { error } = await supabase
      .from("events")
      .update({
        title,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      })
      .eq("id", eventId)

    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath("/calendar")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update event." }
  }
}

export async function deleteEvent(eventId: string) {
  try {
    if (isBuiltInEvent({ id: eventId })) {
      return { error: "Philippine holidays and Quezon occasions cannot be deleted." }
    }
    const { supabase } = await requireStaff()
    if (isLocalMode() || !supabase) {
      await deleteLocalEvent(eventId)
      revalidatePath("/")
      revalidatePath("/calendar")
      return { success: true }
    }
    const { error } = await supabase.from("events").delete().eq("id", eventId)
    if (error) return { error: error.message }
    revalidatePath("/")
    revalidatePath("/calendar")
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete event." }
  }
}
