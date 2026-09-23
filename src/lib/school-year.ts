/** Philippine school year: June 1 – May 31. */
export function schoolYearStart(now = new Date()) {
  const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 5, 1)
}

export function schoolYearLabel(now = new Date()) {
  const start = schoolYearStart(now)
  const startYear = start.getFullYear()
  return `SY ${startYear}–${startYear + 1}`
}

export function monthsSince(iso: string | null | undefined, now = new Date()) {
  if (!iso) return Infinity
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Infinity
  return (now.getTime() - then) / (1000 * 60 * 60 * 24 * 30.44)
}

export function isExportOverdue(lastExportAt: string | null | undefined, now = new Date()) {
  return monthsSince(lastExportAt, now) >= 11
}
