import { useEffect, useEffectEvent, useLayoutEffect } from 'react'
import { useLocation, useMatches, useNavigationType } from 'react-router'
import type { RouteHandle } from './nav'
import { pageTitle } from './pageTitle'

/**
 * The pathname focus last ran for, for the life of the page. A fresh load starts at null, so it leaves
 * focus where the browser puts it; repeating a pathname (StrictMode's second run in dev, an AppShell
 * remounting on the same page) changes nothing; a new pathname, even in another shell, is a navigation.
 */
let lastPathname: string | null = null

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
    const previous = lastPathname
    lastPathname = pathname
    if (previous === null || previous === pathname) return
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
    // The page's scroll is already settled (top for a link, restored on Back); focus mustn't move it.
    heading.focus({ preventScroll: true })
  }, [pathname])
}
