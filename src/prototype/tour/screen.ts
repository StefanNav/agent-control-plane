import { scrollDelta } from '../StoryPanel/scroll'

/** How long a step entry waits for its screen before going on anyway (Ruling 10). */
const SETTLE_TIMEOUT_MS = 1500

/** A smooth scroll counts as done once its scroll events stop for this long (no `scrollend`)… */
const SCROLL_QUIET_MS = 150

/** …or after this long at most. */
const SCROLL_MAX_MS = 1000

/** The screen on show: the key of the outlet's wrapper (`stepKey` while the tour is open) and the route. */
let screen = { key: 0, pathname: '' }
const listeners = new Set<() => void>()

/** The outlet's keyed wrapper reports here when it mounts, and when the route changes under it. */
export function markScreen(key: number, pathname: string): void {
  screen = { key, pathname }
  for (const listener of [...listeners]) listener()
}

/** A route's pathname: what comes before its query or hash. */
export function routePathname(route: string): string {
  return route.split(/[?#]/)[0] ?? route
}

/**
 * Resolves once the screen keyed `stepKey` has mounted with the router on `pathname`, then one
 * animation frame later, so the step's first beat measures the new screen, not the old one (Ruling
 * 10). At once if both hold already. Never rejects: an abort resolves it, and so does a 1500 ms
 * safety wait, so a route that never matches can't stall the tour.
 */
export function settleScreen(
  stepKey: number,
  pathname: string,
  signal: AbortSignal,
  timeoutMs = SETTLE_TIMEOUT_MS,
): Promise<void> {
  const ready = () => screen.key === stepKey && screen.pathname === pathname
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
