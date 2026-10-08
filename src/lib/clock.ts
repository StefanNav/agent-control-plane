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
