import type { BeforeSend } from '@vercel/analytics/react'
import type { StateStorage } from 'zustand/middleware'

const OPT_OUT_KEY = 'acp-notrack'

/**
 * Whether this visit counts in the site's visitor analytics. `?notrack` opts this browser out
 * for good (Stefan's own visits), `?track` opts it back in. An automated browser (the e2e suite,
 * also when it runs against the live URL) never counts.
 */
export function countsThisVisit({
  search,
  storage,
  automated,
}: {
  search: string
  storage: StateStorage
  automated: boolean
}): boolean {
  const params = new URLSearchParams(search)
  if (params.has('notrack')) {
    storage.setItem(OPT_OUT_KEY, '1')
    console.info('Visits from this browser are no longer counted.')
  } else if (params.has('track')) {
    storage.removeItem(OPT_OUT_KEY)
    console.info('Visits from this browser are counted again.')
  }
  return !automated && storage.getItem(OPT_OUT_KEY) !== '1'
}

/**
 * Reports the visit's first page view at the address the visitor opened. A tour link has moved on
 * to its first screen by the time the script loads, so a link made for one recipient
 * (`/for/<name>?tour=open`) would otherwise be recorded as that screen.
 */
export function reportArrivalAt(entryUrl: string): BeforeSend {
  let arrived = false
  return (event) => {
    if (arrived || event.type !== 'pageview') return event
    arrived = true
    return { ...event, url: entryUrl }
  }
}
