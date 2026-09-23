"use client"

import { useMemo, useState, useTransition } from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/events"
import { isStaff } from "@/lib/constants"
import { formatTime, toDatetimeLocal } from "@/lib/format"
import {
  eventChipClass,
  eventDateKey,
  eventKindLabel,
  isBuiltInEvent,
  parseDateKey,
} from "@/lib/holidays"
import type { CalendarEvent, Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function MonthCalendar({
  events,
  profile,
  todayKey,
}: {
  events: CalendarEvent[]
  profile: Profile
  todayKey: string
}) {
  const staff = isStaff(profile.role)
  const [month, setMonth] = useState(() => parseDateKey(todayKey))
  const [selected, setSelected] = useState(() => parseDateKey(todayKey))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [pending, startTransition] = useTransition()

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const selectedKey = format(selected, "yyyy-MM-dd")
  const selectedEvents = events.filter((event) => eventDateKey(event) === selectedKey)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event)
    setDialogOpen(true)
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateEvent(editing.id, formData)
        : await createEvent(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDialogOpen(false)
      setEditing(null)
      toast.success(editing ? "Event updated." : "Event added.")
    })
  }

  function onDelete(eventId: string) {
    if (!confirm("Delete this event?")) return
    startTransition(async () => {
      const result = await deleteEvent(eventId)
      if (result.error) toast.error(result.error)
      else toast.success("Event deleted.")
    })
  }

  const defaultStart = `${format(selected, "yyyy-MM-dd")}T08:00`

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/8 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-heading text-2xl">{format(month, "MMMM yyyy")}</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = parseDateKey(todayKey)
                setMonth(today)
                setSelected(today)
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd")
            const dayEvents = events.filter((event) => eventDateKey(event) === dayKey)
            const inMonth = isSameMonth(day, month)
            const active = isSameDay(day, selected)
            const today = dayKey === todayKey
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex min-h-16 flex-col rounded-xl p-1.5 text-left text-sm transition-colors",
                  inMonth ? "bg-muted/40 hover:bg-muted" : "text-muted-foreground/50",
                  active && "ring-2 ring-primary",
                  today && !active && "bg-primary/10"
                )}
              >
                <span className="text-xs font-medium">{format(day, "d")}</span>
                <span className="mt-auto space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "block truncate rounded px-1 text-[10px]",
                        eventChipClass(event.kind)
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg">{format(selected, "EEEE, MMM d")}</h2>
          {staff ? (
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Add
            </Button>
          ) : null}
        </div>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events on this day.</p>
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((event) => {
              const builtIn = isBuiltInEvent(event)
              return (
                <li key={event.id} className="rounded-xl bg-muted/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{event.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        eventChipClass(event.kind)
                      )}
                    >
                      {eventKindLabel(event.kind)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {builtIn
                      ? "All day"
                      : `${formatTime(event.starts_at)}${event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}`}
                  </p>
                  {event.description ? (
                    <p className="mt-1 text-sm">{event.description}</p>
                  ) : null}
                  {staff && !builtIn ? (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(event)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(event.id)}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit(new FormData(event.currentTarget))
            }}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editing?.title ?? ""}
                placeholder="Faculty meeting"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={
                  editing ? toDatetimeLocal(editing.starts_at) : defaultStart
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ends_at">Ends (optional)</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="datetime-local"
                defaultValue={
                  editing?.ends_at ? toDatetimeLocal(editing.ends_at) : ""
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                placeholder="Where, who should attend, what to bring…"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
