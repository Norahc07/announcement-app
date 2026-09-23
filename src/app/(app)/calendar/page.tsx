import { MonthCalendar } from "@/components/calendar/month-calendar"
import { isStaff } from "@/lib/constants"
import { getEvents } from "@/lib/data/events"
import { manilaDateKey } from "@/lib/holidays"
import { getSessionProfile } from "@/lib/supabase/server"

export default async function CalendarPage() {
  const profile = await getSessionProfile()
  if (!profile) return null
  const events = await getEvents()
  const todayKey = manilaDateKey()

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-3xl">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isStaff(profile.role)
            ? "Philippine holidays and Quezon festivals are already on the calendar. Add meetings, deadlines, and school events on top of those."
            : "Philippine holidays, Quezon special occasions, and school events. Open a day to see the details."}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" />
            PH holiday
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            Quezon
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            School event
          </li>
        </ul>
      </div>
      <MonthCalendar events={events} profile={profile} todayKey={todayKey} />
    </div>
  )
}
