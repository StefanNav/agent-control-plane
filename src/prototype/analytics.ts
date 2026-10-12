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
