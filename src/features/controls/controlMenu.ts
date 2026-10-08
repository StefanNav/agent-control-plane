import type { DemoState, PersonaId } from '../../data/types'
import { can, lockReason, type PermAction } from '../../store/permissions'
import { onBoard, personName } from '../board/selectors'

/** The controls the agent view mounts from `?control=` (6a–6f). `pause` is Phase 3's alias. */
export const CONTROL_IDS = ['pause-activity', 'pause-agent', 'pause-division', 'shadow', 'revoke', 'disable', 'retire'] as const
export type ControlId = (typeof CONTROL_IDS)[number]

/** A `?control=` value, or null for anything unknown. */
export function parseControl(value: string | null): ControlId | null {
  if (value === 'pause') return 'pause-agent'
  return CONTROL_IDS.find((c) => c === value) ?? null
}

export interface ControlMenuItem {
  id: ControlId
  control: ControlId
  label: string
  sub: string
  locked: boolean
}

/** "Its one activity", "Both activities", "All 3 activities". */
export const activityCount = (n: number) => (n === 1 ? 'Its one activity' : n === 2 ? 'Both activities' : `All ${n} activities`)

/** People who may take `action` on this agent, e.g. "Dana or Priya". */
function whoMay(s: DemoState, action: PermAction, agentId: string): string {
  const names = [...new Set(s.roles.map((r) => r.personId))]
    .filter((id) => s.people.some((p) => p.id === id) && can(s, id as PersonaId, action, { agentId }))
    .map((id) => personName(s, id))
  return names.join(' or ')
}

/** The agent view's Controls menu (6a): scope first, narrow fixes, then the permanent ones. */
export function controlMenu(s: DemoState, personaId: PersonaId, agentId: string): { label: string; items: ControlMenuItem[] }[] {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent) return []
  const division = s.divisions.find((d) => d.id === agent.divisionId)
  const activities = s.activities.filter((a) => a.agentId === agentId)
  const main = activities.find((a) => a.level !== 'shadow') ?? activities[0]
  const grants = s.grants.filter((g) => g.agentId === agentId).flatMap((g) => Object.values(g.cells)).filter((c) => c === 'granted' || c === 'changed').length
  const inDivision = s.agents.filter((a) => onBoard(a) && a.divisionId === agent.divisionId).length
  // A disabled agent has no access left to pause or narrow; only retiring remains.
  const disabledBy = agent.lifecycle === 'disabled' && agent.disabled ? `Disabled by ${personName(s, agent.disabled.by)}; access already revoked` : null
  const item = (control: ControlId, label: string, action: PermAction, sub: string): ControlMenuItem => {
    if (disabledBy && control !== 'retire') return { id: control, control, label, sub: disabledBy, locked: true }
    const allowed = can(s, personaId, action, { agentId })
    return { id: control, control, label, sub: allowed ? sub : whoMay(s, action, agentId) || lockReason(action, personaId), locked: !allowed }
  }
  return [
    {
      label: 'Pause',
      items: [
        item('pause-activity', 'Pause this activity…', 'pause', main?.name ?? 'Its main activity'),
        item('pause-agent', 'Pause this agent…', 'pause', activityCount(activities.length)),
        item('pause-division', `Pause every agent in ${division?.name}…`, 'pause', `${inDivision} agents`),
      ],
    },
    {
      label: 'Narrow fixes',
      items: [
        item('revoke', 'Revoke a tool…', 'revokeTool', `${grants} tool grants`),
        item('shadow', 'Return an activity to Shadow…', 'returnToShadow', `Back to Draft needs ${personName(s, agent.sponsorId)} again`),
      ],
    },
    {
      label: 'Program lead or sponsor',
      items: [
        item('disable', 'Disable…', 'disable', 'Access revoked; the record stays live'),
        item('retire', 'Retire…', 'retire', 'Permanent; needs typed confirmation'),
      ],
    },
  ]
}
