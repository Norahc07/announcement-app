import { cache } from "react"
import { getAnnouncement, getAnnouncements } from "@/lib/data/announcements"
import { getUpcomingEvents } from "@/lib/data/events"
import { getStorageUsage } from "@/lib/actions/storage"

export const cachedAnnouncements = cache(getAnnouncements)
export const cachedAnnouncement = cache(getAnnouncement)
export const cachedUpcomingEvents = cache(getUpcomingEvents)
export const cachedStorageUsage = cache(getStorageUsage)
