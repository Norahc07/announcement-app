import { format, formatDistanceToNow } from "date-fns"

export function fromNow(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export function formatDateTime(iso: string) {
  return format(new Date(iso), "MMM d, yyyy · h:mm a")
}

export function formatDate(iso: string) {
  return format(new Date(iso), "MMM d, yyyy")
}

export function formatTime(iso: string) {
  return format(new Date(iso), "h:mm a")
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function toDatetimeLocal(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function firstName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const titles = new Set(["ma'am", "maam", "sir", "mr", "mrs", "ms", "mister", "miss"])
  const rest = parts.filter(
    (part) => !titles.has(part.toLowerCase().replace(/\./g, ""))
  )
  return rest[0] || parts[0] || "there"
}
