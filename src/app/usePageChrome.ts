import { useEffect } from 'react'
import { useLocation, useMatches } from 'react-router'
import type { RouteHandle } from './nav'
import { pageTitle } from './pageTitle'

/** False until the page's first route has rendered: a fresh load leaves focus where the browser puts it. */
let navigated = false

/**
 * The browser tab's title (R3), and focus after navigation (R4): when a link took itself away with
 * the old page, focus goes to the new page's heading instead of falling back to the top of the document.
 */
export function usePageChrome() {
  const matches = useMatches()
  const { pathname } = useLocation()
  let title: string | null = null
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as RouteHandle | undefined
    if (handle && 'title' in handle) {
      title = handle.title
      break
    }
  }

  useEffect(() => {
    document.title = pageTitle(title)
  }, [title])

  useEffect(() => {
    if (!navigated) {
      navigated = true
      return
    }
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
    heading.focus()
  }, [pathname])
}
