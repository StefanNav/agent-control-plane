import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(QUERY)
  if (!query) return () => {}
  // Safari before 14 has only the older listener API.
  if (typeof query.addEventListener !== 'function') {
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const read = () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches

/** The visitor asks for less motion; re-read when the setting changes. False when the browser can't tell. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
