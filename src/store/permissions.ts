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
  | 'requestGoLive'
  | 'pause'
  | 'returnToShadow'
  | 'revokeTool'
  | 'resume'
  | 'disable'
  | 'retire'
  | 'resolveException'
  | 'viewAudit'
  | 'openIncident'
  | 'manageDivisions'
  /** A frontline pharmacist flags a draft from Epic (10a). */
  | 'flagDraft'

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
  // 3a: the owner asks the sponsor to sign the move out of Shadow.
  requestGoLive: { owner: 'own' },
  // 8b: the technical owner "pauses" (Tools · hard stops · pauses); frames beat the PRD matrix (R7).
  pause: { ...STOPPERS, techOwner: 'ownAgents' },
  // 6c and the "Enforce the limits" story: the technical owner may also return an activity to Shadow.
  returnToShadow: { ...STOPPERS, techOwner: 'ownAgents' },
  revokeTool: BUILDERS,
  resume: { sponsor: 'own', owner: 'own' },
  disable: { programLead: 'all', sponsor: 'own' },
  retire: { programLead: 'all', sponsor: 'own' },
  resolveException: BUILDERS,
  viewAudit: ALL_VIEWERS,
  // 7a: opening an incident is the one thing read-only Jordan can create.
  openIncident: ALL_VIEWERS,
  manageDivisions: { programLead: 'all' },
  // 10a: only frontline pharmacists flag drafts, from Epic.
  flagDraft: { frontline: 'own' },
}

export interface PermContext {
  divisionId?: string
  agentId?: string
}

/**
 * Can this person take this action here? Roles are per division ('all' spans every one).
 * With an agent in context, its division applies: a role there covers its agents, and a
 * technical owner may also act on an agent they are named on. Without context, a role held
 * anywhere counts. Any person with a role may be asked, not only the seven personas (8b).
 */
export function can(
  state: Pick<DemoState, 'roles' | 'agents'>,
  personaId: string,
  action: PermAction,
  ctx: PermContext = {},
): boolean {
  const agent = ctx.agentId ? state.agents.find((a) => a.id === ctx.agentId) : undefined
  if (ctx.agentId && !agent) return false
  // R7: the board decides go-live only for Tier 2 and above; Tier 1 goes straight to shadow.
  if (action === 'approveGoLive' && agent && agent.riskTier < 2) return false
  const divisionId = agent?.divisionId ?? ctx.divisionId
  const allowed = MATRIX[action]
  return state.roles.some((assignment) => {
    if (assignment.personId !== personaId) return false
    const scope = allowed[assignment.role]
    if (!scope) return false
    if (scope === 'all' || assignment.divisionId === 'all' || !divisionId) return true
    // A role in the agent's division covers every agent in it (8b: Sam gets a second division, R7).
    if (assignment.divisionId === divisionId) return true
    // The named technical owner may act on their agent whatever division their role is in.
    return scope === 'ownAgents' && agent?.techOwnerId === personaId
  })
}

const REASONS: Partial<Record<PermAction, string>> = {
  manageDivisions: 'Program lead only',
  flagDraft: 'Pharmacists flag drafts from Epic',
  prepareGoLive: 'Program lead only',
  retire: 'Program lead or sponsor only',
  disable: 'Program lead or sponsor only',
  configureTools: 'Technical owner only',
  approveTools: 'Clinical sponsor only',
  signPrivilege: 'Clinical sponsor only',
  approveGoLive: 'Review board only',
  requestGoLive: 'Agent owner only',
  resume: 'Owner and sponsor only',
}

/** Why a control is locked, for menus and tooltips. */
export function lockReason(action: PermAction, personaId?: PersonaId): string {
  if (personaId === 'jordan') return 'Read-only access'
  if (personaId === 'ana') return 'Works in Epic, not the console'
  return REASONS[action] ?? 'Not part of your role here'
}
