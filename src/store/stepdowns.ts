import { STEP_DOWN_MED_REC } from '../data/seed/autonomy'
import type { AgentException, DemoState, Level, Privilege, StepDown } from '../data/types'
import { addMinutes, formatDate } from '../lib/clock'
import { nextExceptionCode, nextVersion } from './mutations'
import { personName } from './onboardingRules'

/** One level at a time (15b): Supervised drops to Draft, Draft to Shadow; Shadow has nowhere lower. */
export const LOWER: Record<Level, Level | null> = { autonomous: 'supervised', supervised: 'draft', draft: 'shadow', shadow: null }
const LEVELS: Level[] = ['shadow', 'draft', 'supervised', 'autonomous']
const NAME: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

export const STEPPED_DOWN = 'Stepped down automatically'

/** The step-down still in force for an activity (or one of its branches), if any. */
export function openStepDown(s: DemoState, activityId: string, branchId?: string): StepDown | undefined {
  return s.stepDowns.find((d) => d.activityId === activityId && (d.branchId ?? null) === (branchId ?? null) && !d.restoredAt)
}

/** The privilege version in force for an activity: the highest that isn't closed. */
function inForce(s: DemoState, activityId: string): Privilege | undefined {
  return s.privileges.filter((p) => p.activityId === activityId && p.state !== 'closed').sort((a, b) => b.version - a.version)[0]
}

/** An agent's level is its highest activity's (board rows). */
function relevel(s: DemoState, agentId: string) {
  const agent = s.agents.find((a) => a.id === agentId)
  const levels = s.activities.filter((a) => a.agentId === agentId).map((a) => LEVELS.indexOf(a.level))
  if (agent && levels.length) agent.level = LEVELS[Math.max(...levels)]!
}

/** The program lead, told of every step-down (15a "You, Priya and Dana"). */
const programLead = (s: DemoState) => s.roles.find((r) => r.role === 'programLead')?.personId

/**
 * A threshold trigger on the privilege in force fires (15a, R12): the activity drops one level at the
 * gateway, a new privilege version records it, drafts in progress go to pharmacists, the agent reads
 * "Stepped down automatically", and the owner gets an exception (sponsor and program lead copied).
 * Idempotent: an activity already stepped down isn't dropped again.
 */
export function applyThresholdStepDown(s: DemoState, activityId: string, input: { trigger: string; routed: number }, at: string): DemoState {
  const activity = s.activities.find((a) => a.id === activityId)
  const agent = s.agents.find((a) => a.id === activity?.agentId)
  const latest = inForce(s, activityId)
  const lower = activity ? LOWER[activity.level] : null
  if (!activity || !agent || !latest || !lower || openStepDown(s, activityId)) return s
  const from = activity.level
  const version = nextVersion(s, latest.code)
  latest.state = 'closed'
  const written: Privilege = { ...latest, id: `${latest.code.toLowerCase()}-v${version}`, version, level: lower, state: 'steppedDown', movedBy: `${latest.code} v${latest.version}`, trigger: input.trigger }
  delete written.proposedLevel
  s.privileges.push(written)
  activity.level = lower
  relevel(s, agent.id)
  agent.judgment = { status: 'warn', label: STEPPED_DOWN }
  const told = [agent.ownerId, agent.sponsorId, programLead(s)].filter((id): id is string => Boolean(id))
  const raisedAt = addMinutes(at, 1)
  const code = nextExceptionCode(s)
  const name = activity.name.replace(/ at admission$/, '')
  const content = activityId === STEP_DOWN_MED_REC.activityId ? STEP_DOWN_MED_REC : null
  const item: AgentException = {
    id: code.toLowerCase(),
    code,
    status: 'warn',
    kind: 'notify',
    type: 'Stepped down',
    reason: `${name} stepped down from ${NAME[from]} to ${NAME[lower]} · ${input.trigger.toLowerCase()}`,
    short: `stepped down to ${NAME[lower]}`,
    agentId: agent.id,
    ruleTag: written.movedBy,
    raisedAt,
    action: 'find and fix the cause',
    actionSub: `back to ${NAME[from]} needs ${personName(s, agent.sponsorId)}’s signature`,
    ownerId: agent.ownerId,
    copied: told.filter((id) => id !== agent.ownerId),
    deadline: `${at.slice(0, 10)}T17:00:00`,
    state: 'new',
    route: 'inbox',
    detail: {
      headline: `${name} stepped down from ${NAME[from]} to ${NAME[lower]} at the gateway`,
      ...(content ? { trendLabel: 'Edit rate · 14 days', trend: content.series, target: content.threshold, cause: content.cause } : {}),
    },
  }
  s.exceptions.push(item)
  s.stepDowns.push({
    id: `sd-${activityId}-${s.stepDowns.length + 1}`,
    agentId: agent.id,
    activityId,
    cause: 'threshold',
    from,
    to: lower,
    at,
    fired: `${latest.code} v${latest.version}`,
    written: `${written.code} v${written.version}`,
    trigger: input.trigger,
    routed: input.routed,
    told,
    exceptionId: item.id,
  })
  return s
}

/** A new signature ends the step-downs on an activity (3c signs it back up): nothing steps up by itself. */
export function closeStepDowns(s: DemoState, activityId: string, by: string, at: string, branchId?: string): DemoState {
  for (const d of s.stepDowns) {
    if (d.activityId !== activityId || d.restoredAt || (d.branchId ?? null) !== (branchId ?? null)) continue
    d.restoredAt = at
    d.restoredBy = by
  }
  const agent = s.agents.find((a) => a.id === s.activities.find((x) => x.id === activityId)?.agentId)
  if (agent && agent.judgment.label === STEPPED_DOWN && !s.stepDowns.some((d) => d.agentId === agent.id && !d.restoredAt)) agent.judgment = { status: 'normal', label: 'Within scope' }
  return s
}

/** "Since 06:00" on the day, else the date. */
export const sinceText = (at: string, now: string) => (at.slice(0, 10) === now.slice(0, 10) ? at.slice(11, 16) : formatDate(at))
