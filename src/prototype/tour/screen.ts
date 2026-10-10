import { scrollDelta } from '../StoryPanel/scroll'

/** How long a step entry waits for its screen before going on anyway (Ruling 10). */
const SETTLE_TIMEOUT_MS = 1500

/** A smooth scroll counts as done once its scroll events stop for this long (no `scrollend`)… */
const SCROLL_QUIET_MS = 150

/** …or after this long at most. */
const SCROLL_MAX_MS = 1000

/**
 * The screen on show: the key of the outlet's wrapper (`stepKey` while the tour is open) and the
 * router's location (pathname and query).
 */
let screen = { key: 0, location: '' }
const listeners = new Set<() => void>()

/** The outlet's keyed wrapper reports here when it mounts, and when the location changes under it. */
export function markScreen(key: number, location: string): void {
  screen = { key, location }
  for (const listener of [...listeners]) listener()
}

const BASE = 'http://tour.invalid'

/**
 * Is a location (pathname and query) on a step's route (Ruling 15)? The pathname matches, and every
 * query param the route sets is there with its value; extra params (`?tour=`) are fine. Hashes don't
 * count.
 */
export function atRoute(location: string, route: string): boolean {
  const at = new URL(location, BASE)
  const want = new URL(route, BASE)
  if (at.pathname !== want.pathname) return false
  for (const [name, value] of want.searchParams) {
    if (!at.searchParams.getAll(name).includes(value)) return false
  }
  return true
}

/**
 * Resolves once the screen keyed `stepKey` has mounted with the router on `route` (its pathname and
 * its query, Ruling 15), then one animation frame later, so the step's first beat measures the new
 * screen, not the old one (Ruling 10). At once if both hold already. Never rejects: an abort
 * resolves it, and so does a 1500 ms safety wait, so a route that never matches can't stall the tour.
 */
export function settleScreen(
  stepKey: number,
  route: string,
  signal: AbortSignal,
  timeoutMs = SETTLE_TIMEOUT_MS,
): Promise<void> {
  const ready = () => screen.key === stepKey && atRoute(screen.location, route)
  if (signal.aborted || ready()) return Promise.resolve()
  return new Promise((resolve) => {
    let waiting = false
    let frame = 0
    const finish = () => {
      listeners.delete(check)
      clearTimeout(timer)
      if (waiting) cancelAnimationFrame(frame)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const check = () => {
      if (waiting || !ready()) return
      waiting = true
      frame = requestAnimationFrame(finish)
    }
    const timer = setTimeout(finish, timeoutMs)
    signal.addEventListener('abort', finish)
    listeners.add(check)
  })
}

/** The browser's location (pathname and query), as the screen reports its own. */
function pageLocation(): string {
  return window.location.pathname + window.location.search
}

/**
 * Call just before the tour clicks: resolves once the page has answered the click, an animation
 * frame later or, if the click changed the URL, once the screen is on the new URL. The router
 * updates the URL during the click but renders it in a transition, so until then the old screen is
 * still up: a panel still showing the previous selection, its link still going there. Never
 * rejects: an abort resolves it, and so does the 1500 ms safety wait.
 */
export function settleClick(signal: AbortSignal, timeoutMs = SETTLE_TIMEOUT_MS): Promise<void> {
  const before = pageLocation()
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    let frame = 0
    const finish = () => {
      listeners.delete(check)
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const check = () => {
      if (screen.location === pageLocation()) finish()
    }
    const timer = setTimeout(finish, timeoutMs)
    signal.addEventListener('abort', finish)
    frame = requestAnimationFrame(() => {
      if (pageLocation() === before) return finish()
      listeners.add(check)
      check()
    })
  })
}

/** Does the visitor ask for less motion? False when the browser can't say. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Scroll the window so `el` shows clear of the tour bar (Ruling 7), by the story panel's rule
 * (`scrollDelta`) with the bar as the panel. Smooth, resolving when the scroll ends; a jump under
 * reduced motion. Resolves at once when no scroll is needed or the page can't scroll that way.
 */
export function revealClear(el: Element, bar: Element | null, reduced: boolean): Promise<void> {
  const delta = scrollDelta(
    el.getBoundingClientRect(),
    bar?.getBoundingClientRect() ?? null,
    window.innerHeight,
  )
  if (delta === 0) return Promise.resolve()
  const page = document.scrollingElement ?? document.documentElement
  const from = window.scrollY
  const to = Math.min(
    Math.max(0, page.scrollHeight - window.innerHeight),
    Math.max(0, from + delta),
  )
  if (to === from) return Promise.resolve()
  if (reduced) {
    window.scrollBy({ top: delta, behavior: 'auto' })
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    let quiet: ReturnType<typeof setTimeout> | undefined
    const done = () => {
      clearTimeout(quiet)
      clearTimeout(cap)
      document.removeEventListener('scrollend', done)
      document.removeEventListener('scroll', onScroll)
      resolve()
    }
    // Browsers without `scrollend` still send `scroll` every frame until the scroll stops.
    const onScroll = () => {
      clearTimeout(quiet)
      quiet = setTimeout(done, SCROLL_QUIET_MS)
    }
    const cap = setTimeout(done, SCROLL_MAX_MS)
    document.addEventListener('scrollend', done)
    document.addEventListener('scroll', onScroll)
    window.scrollBy({ top: delta, behavior: 'smooth' })
  })
}
