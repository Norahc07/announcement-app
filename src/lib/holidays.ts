import type { CalendarEvent, CalendarEventKind } from "@/lib/types"

const SYSTEM_ID = "system"

const CHINESE_NEW_YEAR: Record<number, [number, number]> = {
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
}

const EID_DATES: Record<number, { fitr: [number, number]; adha: [number, number] }> = {
  2024: { fitr: [4, 10], adha: [6, 17] },
  2025: { fitr: [3, 31], adha: [6, 6] },
  2026: { fitr: [3, 20], adha: [5, 27] },
  2027: { fitr: [3, 10], adha: [5, 16] },
  2028: { fitr: [2, 27], adha: [5, 5] },
  2029: { fitr: [2, 15], adha: [4, 24] },
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function phIso(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`
}

function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function shiftYmd(year: number, month: number, day: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1, day + delta))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { year, month, day }
}

function lastMondayOfAugust(year: number) {
  const weekday = new Date(Date.UTC(year, 7, 31)).getUTCDay()
  const offset = weekday === 0 ? 6 : weekday - 1
  return 31 - offset
}

function event(
  kind: CalendarEventKind,
  year: number,
  month: number,
  day: number,
  title: string,
  description: string
): CalendarEvent {
  const starts_at = phIso(year, month, day)
  return {
    id: `holiday-${year}-${pad(month)}-${pad(day)}-${slug(title)}`,
    title,
    description,
    starts_at,
    ends_at: null,
    created_by: SYSTEM_ID,
    created_at: starts_at,
    kind,
  }
}

function eventsForYear(year: number): CalendarEvent[] {
  const easter = easterSunday(year)
  const maundy = shiftYmd(easter.year, easter.month, easter.day, -3)
  const friday = shiftYmd(easter.year, easter.month, easter.day, -2)
  const saturday = shiftYmd(easter.year, easter.month, easter.day, -1)
  const ash = shiftYmd(easter.year, easter.month, easter.day, -46)
  const boling = shiftYmd(ash.year, ash.month, ash.day, -2)

  const list: CalendarEvent[] = [
    event("holiday", year, 1, 1, "New Year's Day", "Regular holiday nationwide."),
    event(
      "holiday",
      year,
      2,
      25,
      "EDSA People Power Anniversary",
      "Special non-working day in most years. Official status follows the presidential proclamation."
    ),
    event(
      "holiday",
      maundy.year,
      maundy.month,
      maundy.day,
      "Maundy Thursday",
      "Regular holiday. Start of the Holy Week break."
    ),
    event(
      "holiday",
      friday.year,
      friday.month,
      friday.day,
      "Good Friday",
      "Regular holiday. Holy Week."
    ),
    event(
      "holiday",
      saturday.year,
      saturday.month,
      saturday.day,
      "Black Saturday",
      "Special non-working day."
    ),
    event(
      "holiday",
      year,
      4,
      9,
      "Araw ng Kagitingan",
      "Day of Valor. Regular holiday."
    ),
    event("holiday", year, 5, 1, "Labor Day", "Regular holiday nationwide."),
    event(
      "holiday",
      year,
      6,
      12,
      "Independence Day",
      "Regular holiday. Philippine Independence Day."
    ),
    event(
      "holiday",
      year,
      8,
      1,
      "Buwan ng Wika begins",
      "National Language Month. Schools usually hold Filipino activities all August."
    ),
    event(
      "holiday",
      year,
      8,
      21,
      "Ninoy Aquino Day",
      "Special non-working day."
    ),
    event(
      "holiday",
      year,
      8,
      lastMondayOfAugust(year),
      "National Heroes Day",
      "Regular holiday. Last Monday of August."
    ),
    event(
      "holiday",
      year,
      10,
      5,
      "World Teachers' Day",
      "Highlight of National Teachers' Month. Not a legal holiday, but observed in schools."
    ),
    event(
      "holiday",
      year,
      11,
      1,
      "All Saints' Day",
      "Special non-working day. Undas."
    ),
    event(
      "holiday",
      year,
      11,
      2,
      "All Souls' Day",
      "Special non-working day in most years."
    ),
    event(
      "holiday",
      year,
      11,
      30,
      "Bonifacio Day",
      "Regular holiday. Birth of Andres Bonifacio."
    ),
    event(
      "holiday",
      year,
      12,
      8,
      "Feast of the Immaculate Conception",
      "Special non-working day."
    ),
    event("holiday", year, 12, 24, "Christmas Eve", "Special working or non-working day by proclamation."),
    event("holiday", year, 12, 25, "Christmas Day", "Regular holiday nationwide."),
    event("holiday", year, 12, 30, "Rizal Day", "Regular holiday. Martyrdom of Jose Rizal."),
    event("holiday", year, 12, 31, "New Year's Eve", "Special non-working day in most years."),
    event(
      "quezon",
      year,
      3,
      2,
      "Quezon Province Foundation Day",
      "Commemorates the civil government of Tayabas (now Quezon) established on 2 March 1901."
    ),
    event(
      "quezon",
      boling.year,
      boling.month,
      boling.day,
      "Boling-Boling Festival (Catanauan)",
      "Pre-Lenten street festival in Catanauan, usually the days before Ash Wednesday."
    ),
    event(
      "quezon",
      year,
      5,
      10,
      "Pasayahan sa Lucena",
      "Lucena City's summer street festival. Exact week may shift; often mid-May."
    ),
    event(
      "quezon",
      year,
      5,
      15,
      "Pahiyas Festival (Lucban)",
      "Quezon's best-known harvest festival. Feast of San Isidro Labrador. Homes are decorated with kiping, produce, and colorful leaf art."
    ),
    event(
      "quezon",
      year,
      5,
      15,
      "Agawan Festival (Sariaya)",
      "San Isidro harvest festival in Sariaya. Hats, produce, and decorations are 'snatched' from a decorated house."
    ),
    event(
      "quezon",
      year,
      5,
      15,
      "Mayohan sa Tayabas",
      "Tayabas harvest and devotion to San Isidro Labrador, held with other Quezon San Isidro festivals."
    ),
    event(
      "quezon",
      year,
      6,
      17,
      "Lucena City Charter Day",
      "Anniversary of Lucena becoming a city (17 June 1961)."
    ),
    event(
      "quezon",
      year,
      8,
      19,
      "Quezon Day",
      "Regular holiday in Quezon Province and Quezon City. Birthday of President Manuel L. Quezon (19 August 1878, Baler)."
    ),
    event(
      "quezon",
      year,
      8,
      20,
      "Niyogyugan Festival (Lucena)",
      "Provincial coconut festival of Quezon, usually a week around Quezon Day in Lucena. Dates are announced yearly."
    ),
    event(
      "quezon",
      year,
      9,
      7,
      "Quezon Province Day",
      "Tayabas Province was renamed Quezon on 7 September 1946 in honor of Manuel L. Quezon."
    ),
  ]

  const cny = CHINESE_NEW_YEAR[year]
  if (cny) {
    list.push(
      event(
        "holiday",
        year,
        cny[0],
        cny[1],
        "Chinese New Year",
        "Special non-working day in most years. Date follows the lunar calendar."
      )
    )
  }

  const eid = EID_DATES[year]
  if (eid) {
    list.push(
      event(
        "holiday",
        year,
        eid.fitr[0],
        eid.fitr[1],
        "Eid'l Fitr",
        "Regular holiday. Official date follows the National Commission on Muslim Filipinos and the presidential proclamation."
      ),
      event(
        "holiday",
        year,
        eid.adha[0],
        eid.adha[1],
        "Eid'l Adha",
        "Regular holiday. Official date follows moon-sighting and the presidential proclamation."
      )
    )
  }

  return list
}

export function listHolidayEvents(fromYear: number, toYear: number): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (let year = fromYear; year <= toYear; year += 1) {
    events.push(...eventsForYear(year))
  }
  return events.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title))
}

export function builtInHolidayEvents(): CalendarEvent[] {
  const year = Number(manilaDateKey().slice(0, 4))
  return listHolidayEvents(year - 1, year + 2)
}

export function isBuiltInEvent(event: Pick<CalendarEvent, "id" | "kind">) {
  return event.kind === "holiday" || event.kind === "quezon" || event.id.startsWith("holiday-")
}

export function manilaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  return `${year}-${month}-${day}`
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function addDaysToDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number)
  const shifted = shiftYmd(year, month, day, days)
  return `${shifted.year}-${pad(shifted.month)}-${pad(shifted.day)}`
}

export function eventDateKey(event: CalendarEvent) {
  if (isBuiltInEvent(event)) return event.starts_at.slice(0, 10)
  return manilaDateKey(new Date(event.starts_at))
}

export function eventKindLabel(kind?: CalendarEventKind) {
  if (kind === "holiday") return "PH holiday"
  if (kind === "quezon") return "Quezon"
  return "School"
}

export function eventChipClass(kind?: CalendarEventKind) {
  if (kind === "holiday") {
    return "bg-rose-500/15 text-rose-800 dark:text-rose-300"
  }
  if (kind === "quezon") {
    return "bg-amber-500/15 text-amber-900 dark:text-amber-300"
  }
  return "bg-primary/15 text-primary"
}

export function eventAccentClass(kind?: CalendarEventKind) {
  if (kind === "holiday") return "border-rose-400"
  if (kind === "quezon") return "border-amber-400"
  return "border-primary/40"
}

export function mergeCalendarEvents(staffEvents: CalendarEvent[]): CalendarEvent[] {
  return [...builtInHolidayEvents(), ...staffEvents].sort((a, b) => {
    const byDate = eventDateKey(a).localeCompare(eventDateKey(b))
    if (byDate !== 0) return byDate
    const order = { holiday: 0, quezon: 1, school: 2 }
    const kindA = order[a.kind ?? "school"]
    const kindB = order[b.kind ?? "school"]
    if (kindA !== kindB) return kindA - kindB
    return 0
  })
}
