import type { DemoState, PersonaId, Role } from '../data/types'

/** Everything a person might try to do in the console (spec §7). */
export type PermAction =
  | 'viewBoard'
  | 'startOnboarding'
  | 'editJobDescription'
  | 'configureTools'
  | 'approveTools'
  | 'prepareGoLive'
  | 'signPrivilege'
  | 'approveGoLive'
  | 'pause'
  | 'returnToShadow'
  | 'revokeTool'
  | 'resume'
  | 'disable'
  | 'retire'
  | 'resolveException'
  | 'viewAudit'
  | 'manageDivisions'

/** How far a role reaches for an action: everywhere, its own divisions, or its own agents. */
type Scope = 'all' | 'own' | 'ownAgents'

const ALL_VIEWERS = { programLead: 'all', sponsor: 'own', owner: 'own', techOwner: 'ownAgents', committee: 'all', readOnly: 'all' } as const
const BUILDERS = { programLead: 'all', sponsor: 'own', owner: 'own', techOwner: 'ownAgents' } as const
const STOPPERS = { programLead: 'all', sponsor: 'own', owner: 'own' } as const

/** The PRD permission matrix as data. Roles not listed get nothing. */
const MATRIX: Record<PermAction, Partial<Record<Role, Scope>>> = {
  viewBoard: ALL_VIEWERS,
  startOnboarding: BUILDERS,
  editJobDescription: BUILDERS,
  configureTools: { techOwner: 'ownAgents' },
  approveTools: { sponsor: 'own' },
  prepareGoLive: { programLead: 'all' },
  signPrivilege: { sponsor: 'own' },
  approveGoLive: { committee: 'all' },
  pause: STOPPERS,
  returnToShadow: STOPPERS,
  revokeTool: BUILDERS,
  resume: { sponsor: 'own', owner: 'own' },
  disable: { programLead: 'all', sponsor: 'own' },
  retire: { programLead: 'all', sponsor: 'own' },
  resolveException: BUILDERS,
  viewAudit: ALL_VIEWERS,
  manageDivisions: { programLead: 'all' },
}

export interface PermContext {
  divisionId?: string
  agentId?: string
}

/**
 * Can this persona take this action here? Roles are per division ('all' spans every one).
 * With an agent in context, its division applies, and "own agents" means agents the
 * persona is technical owner of. Without context, a role held anywhere counts.
 */
export function can(
  state: Pick<DemoState, 'roles' | 'agents'>,
  personaId: PersonaId,
  action: PermAction,
  ctx: PermContext = {},
): boolean {
  const agent = ctx.agentId ? state.agents.find((a) => a.id === ctx.agentId) : undefined
  const divisionId = agent?.divisionId ?? ctx.divisionId
  const allowed = MATRIX[action]
  return state.roles.some((assignment) => {
    if (assignment.personId !== personaId) return false
    const scope = allowed[assignment.role]
    if (!scope) return false
    if (scope === 'all' || assignment.divisionId === 'all' || !divisionId) return true
    if (assignment.divisionId !== divisionId) return false
    return scope === 'own' || !agent || agent.techOwnerId === personaId
  })
}

const REASONS: Partial<Record<PermAction, string>> = {
  manageDivisions: 'Program lead only',
  prepareGoLive: 'Program lead only',
  retire: 'Program lead or sponsor only',
  disable: 'Program lead or sponsor only',
  configureTools: 'Technical owner only',
  approveTools: 'Clinical sponsor only',
  signPrivilege: 'Clinical sponsor only',
  approveGoLive: 'Review board only',
  resume: 'Owner and sponsor only',
}

/** Why a control is locked, for menus and tooltips. */
export function lockReason(action: PermAction, personaId?: PersonaId): string {
  if (personaId === 'jordan') return 'Read-only access'
  if (personaId === 'ana') return 'Works in Epic, not the console'
  return REASONS[action] ?? 'Not part of your role here'
}
