const PRODUCT = 'Attune Agent Control Plane'
const HOME = 'Attune · Agent Control Plane'

/** The browser tab's title for a route (Phase 9 R3); `null` is an unknown path. */
export function pageTitle(title: string | null): string {
  if (title === HOME) return HOME
  return `${title ?? 'Page not found'} · ${PRODUCT}`
}
