import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { AgentView } from '../features/board/AgentView'
import { DivisionView } from '../features/board/DivisionView'
import { HospitalBoard } from '../features/board/HospitalBoard'
import { WallDisplay } from '../features/board/WallDisplay'
import { InboxPage } from '../features/inbox/InboxPage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { ActionsPage } from '../features/audit/ActionsPage'
import { ActionTracePage } from '../features/audit/ActionTracePage'
import { IncidentPage } from '../features/audit/IncidentPage'
import { IncidentsPage } from '../features/audit/IncidentsPage'
import { ExportPage } from '../features/audit/ExportPage'
import { OnboardingPage } from '../features/onboarding/OnboardingPage'
import { CasePage } from '../features/golive/CasePage'
import { MyPrivilegesPage } from '../features/golive/MyPrivilegesPage'
import { SignPage } from '../features/golive/SignPage'
import { PacketPage } from '../features/review/PacketPage'
import { RecordPage } from '../features/review/RecordPage'
import { RiskTierPage } from '../features/review/RiskTierPage'
import { DivisionSettingsPage } from '../features/settings/DivisionSettingsPage'
import { EpicPage } from '../features/epic/EpicPage'
import { GatewayPage } from '../features/gateway/GatewayPage'
import { ReviewersPage } from '../features/reviewers/ReviewersPage'
import { UnitPage } from '../features/reviewers/UnitPage'
import { PeoplePage } from '../features/settings/PeoplePage'
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
  '/operations/inbox': <InboxPage />,
  '/operations/inbox/:exceptionId': <InboxPage />,
  '/inventory': <InventoryPage />,
  '/operations/actions': <ActionsPage />,
  '/operations/actions/:actionId': <ActionTracePage />,
  '/operations/incidents': <IncidentsPage />,
  '/operations/incidents/:incidentId': <IncidentPage />,
  '/reports/export': <ExportPage />,
  '/inventory/agents/:agentId/onboarding/:step': <OnboardingPage />,
  '/inventory/agents/:agentId': <RecordPage />,
  '/inventory/agents/:agentId/risk-tier': <RiskTierPage />,
  '/portfolio/reviews/:reviewId': <PacketPage />,
  '/operations/agents/:agentId/cases/:caseId': <CasePage />,
  '/inventory/privileges/:privilegeId/sign': <SignPage />,
  '/portfolio/privileges': <MyPrivilegesPage />,
  '/wall': <WallDisplay />,
  '/settings/divisions/:divisionId': <DivisionSettingsPage />,
  '/settings/people': <PeoplePage />,
  '/epic': <EpicPage />,
  '/inventory/unregistered': <GatewayPage />,
  '/inventory/unregistered/:callerId': <GatewayPage />,
  '/operations/reviewers': <ReviewersPage />,
  '/operations/reviewers/:unitId': <UnitPage />,
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
