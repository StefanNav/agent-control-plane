import { useEffect, useEffectEvent, useLayoutEffect } from 'react'
import { useLocation, useMatches, useNavigationType } from 'react-router'
import type { RouteHandle } from './nav'
import { pageTitle } from './pageTitle'

/** False until the page's first route has rendered: a fresh load leaves focus where the browser puts it. */
let navigated = false

/**
 * The browser tab's title (R3), scroll on navigation (R8), and focus after navigation (R4): when a
 * link took itself away with the old page, focus goes to the new page's heading instead of falling
 * back to the top of the document.
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

  // A new page reached by a link opens at its top (R8). Back and Forward (POP) are left to the browser,
  // which restores where the visitor was; a change of query only (a tab, a row, a story step) stays put.
  const navigationType = useNavigationType()
  const toTop = useEffectEvent(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  })
  useLayoutEffect(() => toTop(), [pathname])

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
