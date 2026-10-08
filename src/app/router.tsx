import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { AgentView } from '../features/board/AgentView'
import { DivisionView } from '../features/board/DivisionView'
import { HospitalBoard } from '../features/board/HospitalBoard'
import { NotFound } from '../layout/NotFound'
import { ComponentGallery } from '../prototype/ComponentGallery/ComponentGallery'
import { AppShell } from './AppShell'
import type { RouteHandle, ShellKind } from './nav'
import { Placeholder } from './Placeholder'
import { RouteError } from './RouteError'
import { redirects, routeTable } from './routes'

/** Real screens by route path. Routes not listed here render their Placeholder. */
const PAGES: Record<string, ReactNode> = {
  '/about/components': <ComponentGallery />,
  '/operations': <HospitalBoard />,
  '/operations/divisions/:divisionId': <DivisionView />,
  '/operations/agents/:agentId': <AgentView />,
}

function childrenFor(shell: ShellKind): RouteObject[] {
  return routeTable
    .filter((route) => route.shell === shell)
    .map((route) => ({
      path: route.path,
      element: PAGES[route.path] ?? <Placeholder route={route} />,
      handle: { nav: route.nav } satisfies RouteHandle,
      errorElement: <RouteError />,
    }))
}

/** Three layout routes (one per shell); errors render inside the shell via each child's errorElement. */
export const routes: RouteObject[] = [
  {
    element: <AppShell shell="app" />,
    children: [
      ...childrenFor('app'),
      ...Object.entries(redirects).map(([from, to]) => ({
        path: from,
        element: <Navigate to={to} replace />,
        errorElement: <RouteError />,
      })),
      { path: '*', element: <NotFound />, handle: { nav: null } satisfies RouteHandle, errorElement: <RouteError /> },
    ],
  },
  { element: <AppShell shell="prototype" />, children: childrenFor('prototype') },
  { element: <AppShell shell="kiosk" />, children: childrenFor('kiosk') },
]

export const router = createBrowserRouter(routes)
