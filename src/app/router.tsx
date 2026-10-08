import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { NotFound } from '../layout/NotFound'
import { AppShell } from './AppShell'
import type { RouteHandle, ShellKind } from './nav'
import { Placeholder } from './Placeholder'
import { redirects, routeTable } from './routes'

/** Real screens by route path. Routes not listed here render their Placeholder. */
const PAGES: Record<string, ReactNode> = {}

function childrenFor(shell: ShellKind): RouteObject[] {
  return routeTable
    .filter((route) => route.shell === shell)
    .map((route) => ({
      path: route.path,
      element: PAGES[route.path] ?? <Placeholder route={route} />,
      handle: { nav: route.nav } satisfies RouteHandle,
    }))
}

export const router = createBrowserRouter([
  {
    element: <AppShell shell="app" />,
    children: [
      ...childrenFor('app'),
      ...Object.entries(redirects).map(([from, to]) => ({
        path: from,
        element: <Navigate to={to} replace />,
      })),
      { path: '*', element: <NotFound />, handle: { nav: null } satisfies RouteHandle },
    ],
  },
  { element: <AppShell shell="prototype" />, children: childrenFor('prototype') },
  { element: <AppShell shell="kiosk" />, children: childrenFor('kiosk') },
])
