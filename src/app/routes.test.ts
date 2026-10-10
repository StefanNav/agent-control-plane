import { matchPath } from 'react-router'
import { redirects, routeTable } from './routes'

const EXPECTED = [
  '/', '/about', '/about/components',
  '/operations', '/operations/divisions/:divisionId', '/operations/agents/:agentId',
  '/operations/agents/:agentId/cases/:caseId', '/operations/inbox', '/operations/inbox/:exceptionId',
  '/operations/actions', '/operations/actions/:actionId', '/operations/incidents',
  '/operations/incidents/:incidentId', '/operations/reviewers', '/operations/reviewers/:unitId',
  '/operations/sampling',
  '/inventory', '/inventory/agents/:agentId', '/inventory/agents/:agentId/onboarding/:step',
  '/inventory/agents/:agentId/risk-tier', '/inventory/privileges/:privilegeId/sign',
  '/inventory/unregistered', '/inventory/unregistered/:callerId', '/inventory/promotions/:promotionId',
  '/portfolio/privileges', '/portfolio/reviews/:reviewId', '/portfolio/promotions/:promotionId',
  '/portfolio/activities/:activityId', '/portfolio/activities/:activityId/branches/:branchId',
  '/reports/evidence', '/reports/evidence/:agentId', '/reports/export',
  '/settings/divisions/:divisionId', '/settings/people',
  '/wall', '/epic',
  '/tour/problem', '/tour/decisions', '/tour/process', '/tour/validate',
]

test('route table has exactly the spec routes', () => {
  expect(routeTable.map((r) => r.path).sort()).toEqual([...EXPECTED].sort())
})

test('every samplePath matches its pattern', () => {
  for (const r of routeTable) expect(matchPath(r.path, r.samplePath), r.path).not.toBeNull()
})

test('redirect targets exist', () => {
  for (const to of Object.values(redirects)) {
    expect(routeTable.some((r) => matchPath(r.path, to))).toBe(true)
  }
})

const PROTOTYPE = ['/', '/about', '/about/components', '/epic', '/tour/problem', '/tour/decisions', '/tour/process', '/tour/validate']

test('wall is kiosk; landing, about, gallery, epic and the tour’s interludes are prototype; the rest are app', () => {
  const shellOf = (path: string) => routeTable.find((r) => r.path === path)?.shell
  expect(shellOf('/wall')).toBe('kiosk')
  for (const p of PROTOTYPE) expect(shellOf(p)).toBe('prototype')
  for (const r of routeTable.filter((r) => r.path !== '/wall' && !PROTOTYPE.includes(r.path))) {
    expect(r.shell, r.path).toBe('app')
  }
})

test('the tour’s interludes are Phase 10 pages with no frames', () => {
  for (const r of routeTable.filter((r) => r.path.startsWith('/tour/'))) {
    expect(r, r.path).toMatchObject({ phase: 10, frames: [], nav: null })
  }
})

test('app routes name their nav section from the path', () => {
  for (const r of routeTable.filter((r) => r.shell === 'app')) {
    expect(r.nav, r.path).toBe(r.path.split('/')[1])
  }
})
