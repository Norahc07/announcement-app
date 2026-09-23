import Link from "next/link"
import { format } from "date-fns"
import { CalendarDays } from "lucide-react"
import { formatTime } from "@/lib/format"
import {
  eventAccentClass,
  eventDateKey,
  eventKindLabel,
  isBuiltInEvent,
} from "@/lib/holidays"
import type { CalendarEvent } from "@/lib/types"
import { cn } from "@/lib/utils"

function displayDate(event: CalendarEvent) {
  const [year, month, day] = eventDateKey(event).split("-").map(Number)
  return format(new Date(year, month - 1, day), "MMM d, yyyy")
}

export function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  return (
    <aside className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/8 xl:min-h-[22rem]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading flex items-center gap-2 text-lg">
          <CalendarDays className="size-4 text-primary" />
          Coming up
        </h2>
        <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">
          Full calendar
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events in the next two weeks. Check the calendar for later dates.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className={cn("border-l-2 pl-3", eventAccentClass(event.kind))}
            >
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {displayDate(event)} ·{" "}
                {isBuiltInEvent(event) ? "All day" : formatTime(event.starts_at)}
                {" · "}
                {eventKindLabel(event.kind)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
