import { createClient } from "@/lib/supabase/server"
import {
  addDaysToDateKey,
  eventDateKey,
  manilaDateKey,
  mergeCalendarEvents,
} from "@/lib/holidays"
import { isLocalMode } from "@/lib/local/mode"
import { listEvents } from "@/lib/local/db"
import type { CalendarEvent } from "@/lib/types"

async function getStaffEvents(): Promise<CalendarEvent[]> {
  if (isLocalMode()) return listEvents()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      creator:profiles!created_by (id, full_name, role)
    `
    )
    .order("starts_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as CalendarEvent[]
}

export async function getEvents(): Promise<CalendarEvent[]> {
  return mergeCalendarEvents(await getStaffEvents())
}

export async function getUpcomingEvents(days = 14): Promise<CalendarEvent[]> {
  const from = manilaDateKey()
  const to = addDaysToDateKey(from, days)
  const events = await getEvents()
  return events.filter((event) => {
    const key = eventDateKey(event)
    return key >= from && key <= to
  })
}
