import type { NavSection, ShellKind } from './nav'

export type { ShellKind } from './nav'

/**
 * Every route in the prototype (spec §5.5). The router, placeholder pages and the
 * Playwright route smoke test all read this table. Frames and phases come from spec §8.
 */
export interface RouteDef {
  path: string
  nav: NavSection | null
  shell: ShellKind
  title: string
  /** Design frames this route shows. Empty = composed screen (no frame). */
  frames: string[]
  /** Build phase that replaces the placeholder. */
  phase: number
  /** A concrete URL for this route, used by tests and links. */
  samplePath: string
}

type Def = [path: string, title: string, frames: string[], phase: number, samplePath?: string]

function app(nav: NavSection, defs: Def[]): RouteDef[] {
  return defs.map(([path, title, frames, phase, samplePath]) => ({
    path,
    nav,
    shell: 'app',
    title,
    frames,
    phase,
    samplePath: samplePath ?? path,
  }))
}

function outside(shell: ShellKind, defs: Def[]): RouteDef[] {
  return defs.map(([path, title, frames, phase, samplePath]) => ({
    path,
    nav: null,
    shell,
    title,
    frames,
    phase,
    samplePath: samplePath ?? path,
  }))
}

export const routeTable: RouteDef[] = [
  ...outside('prototype', [
    ['/', 'Signal · Agent Control Plane', [], 8],
    ['/about', 'About this prototype', [], 8],
    ['/about/components', 'Countersign components', ['C'], 1],
    ['/epic', 'Epic stand-in', ['10a', '10b'], 6],
  ]),
  ...outside('kiosk', [['/wall', 'Wall display', ['4e'], 3]]),
  ...app('operations', [
    ['/operations', 'Command Board', ['4a', '4d', '4f'], 3],
    ['/operations/divisions/:divisionId', 'Division view', ['4b'], 3, '/operations/divisions/medications'],
    [
      '/operations/agents/:agentId',
      'Agent view',
      ['4c', '3a', '6a', '6b', '6c', '6d', '6e', '9a', '15a'],
      3,
      '/operations/agents/med-rec',
    ],
    ['/operations/agents/:agentId/cases/:caseId', 'Sample case', ['3b'], 5, '/operations/agents/med-rec/cases/enc-4105'],
    ['/operations/inbox', 'Inbox', ['5a', '5c'], 3],
    ['/operations/inbox/:exceptionId', 'Inbox', ['5a', '5b', '5d'], 3, '/operations/inbox/exc-5530'],
    ['/operations/actions', 'Actions', ['7a'], 4],
    ['/operations/actions/:actionId', 'Action trace', ['7b'], 4, '/operations/actions/act-88213'],
    ['/operations/incidents', 'Incidents', [], 4],
    ['/operations/incidents/:incidentId', 'Incident record', ['7c'], 4, '/operations/incidents/inc-0029'],
    ['/operations/reviewers', 'Reviewer behaviour', ['11a'], 6],
    ['/operations/reviewers/:unitId', 'Reviewer behaviour by unit', ['11b'], 6, '/operations/reviewers/6-north'],
    ['/operations/sampling', 'Sampling queue', ['13b'], 7],
  ]),
  ...app('inventory', [
    ['/inventory', 'Inventory', ['8c', '1i', '6f'], 4],
    ['/inventory/agents/:agentId', 'Agent record', ['2d'], 5, '/inventory/agents/med-rec'],
    [
      '/inventory/agents/:agentId/onboarding/:step',
      'Onboarding',
      ['1a', '2a', '1b', '1c', '1d', '1g', '1e', '1f', '1h'],
      5,
      '/inventory/agents/med-rec/onboarding/job',
    ],
    ['/inventory/agents/:agentId/risk-tier', 'Risk tier', ['2b'], 5, '/inventory/agents/med-rec/risk-tier'],
    ['/inventory/privileges/:privilegeId/sign', 'Sign the privilege', ['3c'], 5, '/inventory/privileges/prv-0142/sign'],
    ['/inventory/unregistered/:callerId', 'Unregistered caller', ['9b'], 6, '/inventory/unregistered/gw-caller-01'],
    ['/inventory/promotions/:promotionId', 'Promotion', ['14a'], 7, '/inventory/promotions/prm-0007'],
  ]),
  ...app('portfolio', [
    ['/portfolio/privileges', 'My privileges', ['3d'], 5],
    ['/portfolio/reviews/:reviewId', 'Committee packet', ['2c'], 5, '/portfolio/reviews/med-rec'],
    ['/portfolio/promotions/:promotionId', 'Promotion decision', ['14b'], 7, '/portfolio/promotions/prm-0007'],
    ['/portfolio/activities/:activityId', 'Review level', ['13a'], 7, '/portfolio/activities/allergy-recon'],
    [
      '/portfolio/activities/:activityId/branches/:branchId',
      'Activity branch',
      ['15b'],
      7,
      '/portfolio/activities/allergy-recon/branches/outside-records',
    ],
  ]),
  ...app('reports', [
    ['/reports/evidence', 'RUAIH evidence', ['12a'], 7],
    ['/reports/evidence/:agentId', 'Evidence packet', ['12b'], 7, '/reports/evidence/med-rec'],
    ['/reports/export', 'Export records', ['7d'], 4],
  ]),
  ...app('settings', [
    ['/settings/divisions/:divisionId', 'Division settings', ['8a'], 6, '/settings/divisions/medications'],
    ['/settings/people', 'People and roles', ['8b'], 6],
  ]),
]

/** Nav sections without their own page go to the nearest designed screen. */
export const redirects: Record<string, string> = {
  '/portfolio': '/portfolio/privileges',
  '/reports': '/reports/evidence',
  '/settings': '/settings/divisions/medications',
}
