import { ALLERGY_V130, STEP_DOWN_MED_REC } from '../data/seed/autonomy'
import type { AgentException, DemoState, Level, Privilege, StepDown } from '../data/types'
import { addMinutes, formatDate } from '../lib/clock'
import { applyNewVersionLevels } from './levels'
import { nextExceptionCode, nextVersion } from './mutations'
import { raiseItem, resolveItems } from './onboarding'
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

export const VERSION_TRIGGER = 'Any new agent or SOP version'
export const restoreItem = (level: Level) => `Review: restore ${NAME[level]}`

/**
 * A new build deployed straight to the gateway (no hold, 15b, R12): every branch or activity above
 * Draft drops one level, a new privilege version records it, a re-validation replay starts, the
 * sponsor is asked to sign it back and the owner is told; Reduced review goes back to Normal. Draft
 * and Shadow don't move (a pharmacist already signs every output there). The same build twice is a no-op.
 */
export function applyVersionDeploy(s: DemoState, agentId: string, input: { build: string; by: string }, at: string): DemoState {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent || agent.version === input.build) return s
  const from = agent.version
  agent.version = input.build
  const replay = agentId === ALLERGY_V130.agentId && input.build === ALLERGY_V130.build ? ALLERGY_V130.revalidation : null
  for (const activity of s.activities.filter((a) => a.agentId === agentId)) {
    const above = activity.branches.filter((b) => LEVELS.indexOf(b.level ?? activity.level) > LEVELS.indexOf('draft'))
    for (const branch of above) {
      const latest = inForce(s, activity.id)
      const level = branch.level ?? activity.level
      const lower = LOWER[level]
      if (!latest || !lower) continue
      const version = nextVersion(s, latest.code)
      latest.state = 'closed'
      const written: Privilege = {
        ...latest,
        id: `${latest.code.toLowerCase()}-v${version}`,
        version,
        state: 'steppedDown',
        movedBy: `${latest.code} v${latest.version}`,
        trigger: VERSION_TRIGGER,
        branchLevels: { ...latest.branchLevels, [branch.id]: lower },
      }
      s.privileges.push(written)
      branch.level = lower
      const link = `/portfolio/activities/${activity.id}/branches/${branch.id}`
      raiseItem(s, {
        agentId,
        type: restoreItem(level),
        reason: `${branch.name} stepped down to ${NAME[lower]} when ${agent.name} ${input.build} was deployed`,
        action: 'sign when the replay meets every criterion',
        actionSub: `Returning to ${NAME[level]} needs your signature, not the board`,
        ownerId: agent.sponsorId,
        copied: [agent.ownerId],
        link: { label: 'Open the branch', to: link },
        at,
      })
      s.stepDowns.push({
        id: `sd-${activity.id}-${branch.id}-${s.stepDowns.length + 1}`,
        agentId,
        activityId: activity.id,
        branchId: branch.id,
        cause: 'version',
        from: level,
        to: lower,
        at,
        fired: `${latest.code} v${latest.version}`,
        written: `${written.code} v${written.version}`,
        trigger: VERSION_TRIGGER,
        routed: 0,
        told: [agent.ownerId, agent.sponsorId],
        build: { from, to: input.build, by: input.by },
        ...(replay ? { revalidation: { ...replay, doneAt: addMinutes(at, replay.minutes) } } : {}),
      })
      s.logEvents.push({ id: `log-stepdown-${branch.id}-${s.stepDowns.length}`, at, agentId, text: `${branch.name} stepped down to ${NAME[lower]}`, sub: `New agent version ${input.build} · re-validation started`, to: [agent.ownerId] })
    }
  }
  applyNewVersionLevels(s, agentId, at)
  return s
}

/** Is the re-validation done and good enough for the sponsor to sign the branch back (15b)? */
export const replayDone = (s: DemoState, d: StepDown) => Boolean(d.revalidation && s.now >= d.revalidation.doneAt)

/** "Sign to restore Supervised" (15b, BR-07): the sponsor's signature returns the branch to the level it held. */
export function applyRestore(s: DemoState, stepDownId: string, by: string, at: string): DemoState {
  const d = s.stepDowns.find((x) => x.id === stepDownId)
  const activity = s.activities.find((a) => a.id === d?.activityId)
  const branch = activity?.branches.find((b) => b.id === d?.branchId)
  const latest = activity ? inForce(s, activity.id) : undefined
  if (!d || !activity || !branch || !latest || d.restoredAt || !replayDone(s, d) || !d.revalidation?.meets) return s
  const version = nextVersion(s, latest.code)
  latest.state = 'closed'
  const restored: Privilege = { ...latest, id: `${latest.code.toLowerCase()}-v${version}`, version, state: 'active', grantedBy: by, grantedAt: at, branchLevels: { ...latest.branchLevels, [branch.id]: d.from } }
  delete restored.movedBy
  delete restored.trigger
  s.privileges.push(restored)
  branch.level = d.from
  d.restoredAt = at
  d.restoredBy = by
  resolveItems(s, d.agentId, restoreItem(d.from), by, at, `Restored · ${restored.code} v${restored.version}`)
  return s
}
