/**
 * The demo clock. "Now" lives in the store (`state.now`, default DEMO_NOW); these helpers
 * format local, timezone-free ISO strings ('2026-12-08T09:52:00') the same way on every machine.
 */
export const DEMO_NOW = '2026-12-08T09:52:00'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const at = (iso: string) => new Date(iso)

/** '09:52' */
export function formatClock(iso: string): string {
  const d = at(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** '09:42:17' */
export function formatClockSeconds(iso: string): string {
  const d = at(iso)
  return `${formatClock(iso)}:${pad(d.getSeconds())}`
}

/** '09:38:04.512' */
export function formatMs(iso: string): string {
  return `${formatClockSeconds(iso)}.${pad(at(iso).getMilliseconds(), 3)}`
}

/** 'Tue 08 Dec' */
export function formatDay(iso: string): string {
  const d = at(iso)
  return `${DAYS[d.getDay()]} ${formatDate(iso)}`
}

/** '08 Dec' */
export function formatDate(iso: string): string {
  const d = at(iso)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`
}

/** Back to a local, timezone-free ISO string. */
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

/** iso + n minutes. */
export function addMinutes(iso: string, minutes: number): string {
  return toIso(new Date(at(iso).getTime() + minutes * 60000))
}

/** Calendar days from one date to another, ignoring the time of day ('08 Dec 09:52' to '29 Dec' is 21). */
export function dayGap(from: string, to: string): number {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  return Math.round((day(to) - day(from)) / 86400000)
}

/** iso + n calendar days, same wall-clock time (daylight-saving safe). */
export function addDays(iso: string, days: number): string {
  const d = at(iso)
  return toIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds()))
}

/** The next day at 'hh:mm', e.g. tomorrowAt(now, '07:00') for "until tomorrow 07:00". */
export function tomorrowAt(iso: string, hhmm: string): string {
  const d = at(iso)
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return toIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, m))
}

/** b − a in whole minutes. */
export function minutesBetween(a: string, b: string): number {
  return Math.round((at(b).getTime() - at(a).getTime()) / 60000)
}

function span(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h} h ${m} min` : `${h} h`
  }
  const days = Math.round(minutes / (24 * 60))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** 'in 48 min', 'in 2 h 18 min', 'in 6 days', or 'Overdue 12 min' when target is past. */
export function formatRelative(target: string, now: string): string {
  const minutes = minutesBetween(now, target)
  return minutes >= 0 ? `in ${span(minutes)}` : `Overdue ${span(-minutes)}`
}

/** '2 h 14 min ago' */
export function formatAgo(then: string, now: string): string {
  return `${span(Math.max(0, minutesBetween(then, now)))} ago`
}

/** Board age: '10 min', '1 h 47', '3 h 06', '7 d'. */
export function formatAge(from: string, now: string): string {
  const minutes = Math.max(0, minutesBetween(from, now))
  if (minutes < 60) return `${minutes} min`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)}`
  return `${Math.floor(minutes / (24 * 60))} d`
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Calendar days from now's date to the target's date. */
function dayOffset(target: string, now: string): number {
  const a = at(now)
  const b = at(target)
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((end - start) / (24 * 60 * 60000))
}

/** Inbox deadline: 'Due 10:46', 'Due tomorrow', 'Due Friday', 'Due 15 Dec', or '1 h 14 min late'. */
export function formatDue(deadline: string, now: string): string {
  const minutes = minutesBetween(now, deadline)
  if (minutes < 0) return `${span(-minutes)} late`
  const days = dayOffset(deadline, now)
  if (days === 0) return `Due ${formatClock(deadline)}`
  if (days === 1) return 'Due tomorrow'
  if (days < 7) return `Due ${WEEKDAYS[at(deadline).getDay()]}`
  return `Due ${formatDate(deadline)}`
}
