import type { Agent, DemoState, PauseDetail } from '../data/types'
import { addDays, formatDate } from '../lib/clock'

/**
 * State changes shared by store actions and scenarios, so a scenario builds exactly the state
 * the UI would. Each mutates the draft it is given (callers pass a copy) and returns it.
 */

/** Work in flight for the pause preview (6b). Agents without a seeded queue derive one from `metrics.day`. */
export function queueOf(agent: Agent): NonNullable<Agent['queue']> {
  if (agent.queue) return agent.queue
  const day = agent.metrics.day ?? 0
  return { inProgress: Math.round(day / 12), awaitingReview: Math.round(day / 35), perHour: Math.round(day / 24) }
}

const nameOf = (s: DemoState, personId: string) => s.people.find((p) => p.id === personId)?.name ?? personId

/** Pause agents (or one activity), routing drafts in progress back to pharmacists. */
export function applyPause(
  s: DemoState,
  agentIds: string[],
  input: { scope: PauseDetail['scope']; activityId?: string; reason?: string },
  by: string,
  at: string = s.now,
): DemoState {
  for (const id of agentIds) {
    const agent = s.agents.find((a) => a.id === id)
    if (!agent) continue
    const routed = queueOf(agent).inProgress
    agent.pause = {
      scope: input.scope,
      ...(input.activityId ? { activityId: input.activityId } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      routed,
      wasJudgment: agent.judgment,
    }
    agent.pausedBy = by
    agent.pausedAt = at
    if (input.scope === 'activity') {
      const activity = s.activities.find((a) => a.id === input.activityId)
      if (activity) activity.paused = true
    } else {
      agent.lifecycle = 'paused'
      agent.judgment = { status: 'paused', label: `Paused by ${nameOf(s, by)}` }
    }
    s.logEvents.push({ id: `log-pause-${s.logEvents.length + 1}`, at, agentId: id, text: `${routed} drafts routed to pharmacists`, sub: `Paused by ${nameOf(s, by)}` })
    // The reason field says it "goes on the incident record": an open incident gets the pause.
    const incident = s.incidents.find((i) => i.agentId === id && i.state !== 'closed')
    incident?.timeline.push({ at, title: `${nameOf(s, by)} paused ${input.scope === 'activity' ? 'one activity' : 'the agent'}`, sub: `${routed} drafts to pharmacists`, by })
  }
  return s
}

/** Undo a pause once both people have approved: judgment, levels and lifecycle come back. */
export function applyResume(s: DemoState, agentId: string, approvedBy: string): DemoState {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent || (!agent.pause && agent.lifecycle !== 'paused')) return s
  // Seeded pauses carry no detail; they come back within scope.
  agent.judgment = agent.pause?.wasJudgment ?? { status: 'normal', label: 'Within scope' }
  if (agent.lifecycle === 'paused') agent.lifecycle = 'live'
  for (const activity of s.activities) if (activity.agentId === agentId) delete activity.paused
  delete agent.pause
  delete agent.pausedBy
  delete agent.pausedAt
  s.resumeRequests = s.resumeRequests.filter((r) => r.agentId !== agentId)
  const incident = s.incidents.find((i) => i.agentId === agentId && i.state !== 'closed')
  incident?.timeline.push({ at: s.now, title: 'Resume approved', sub: nameOf(s, approvedBy), by: approvedBy })
  return s
}

export const nextCode = (codes: string[], prefix: string, width: number) => {
  const max = Math.max(0, ...codes.map((c) => Number(c.slice(prefix.length)) || 0))
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

/** "INC-0031" after INC-0030. */
export const nextIncidentCode = (s: DemoState) => nextCode(s.incidents.map((i) => i.code), 'INC-', 4)

/** "RET-07" after RET-06. */
export const nextArchiveCode = (s: DemoState) =>
  nextCode(s.agents.flatMap((a) => (a.retirement ? [a.retirement.code] : [])), 'RET-', 2)

/** "PRV-0144" after PRV-0143: the next privilege record (ruling R11). */
export const nextPrivilegeCode = (s: DemoState) => nextCode(s.privileges.map((p) => p.code), 'PRV-', 4)

/** "HS-12": the next hard-stop code after the library's, every agent's and every record's (ruling R10). */
export const nextHardStopCode = (s: DemoState, extra: string[] = [], library: string[] = []) =>
  nextCode([...s.hardStops.map((h) => h.code), ...s.onboardings.flatMap((r) => r.limits.map((l) => l.code)), ...library, ...extra], 'HS-', 2)

/** The next inbox code; codes before the demo's own start at EXC-5401, so a rewound October never restarts at EXC-0001. */
export const nextExceptionCode = (s: DemoState) => nextCode(['EXC-5400', ...s.exceptions.map((e) => e.code)], 'EXC-', 4)

/**
 * Every signed privilege past its review date raises one "Review overdue" for its sponsor (3d), copied
 * to the owner and the program lead, due when the division's grace period closes (8a). Idempotent.
 */
export function raiseOverdueReviews(s: DemoState): DemoState {
  const lead = s.roles.find((r) => r.role === 'programLead')?.personId
  for (const p of s.privileges) {
    if (p.level === 'shadow' || (p.state !== 'active' && p.state !== 'due') || !p.reviewDate || p.reviewDate >= s.now) continue
    const agent = s.agents.find((a) => a.id === p.agentId)
    if (!agent || agent.lifecycle === 'retired') continue
    p.state = 'due'
    const open = s.exceptions.some((e) => e.agentId === p.agentId && e.type === 'Review overdue' && e.ruleTag === p.code && e.state !== 'resolved' && e.state !== 'dismissed')
    if (open) continue
    const code = nextExceptionCode(s)
    s.exceptions.push({
      id: code.toLowerCase(),
      code,
      status: 'warn',
      kind: 'review',
      type: 'Review overdue',
      reason: `Privilege review date passed on ${formatDate(p.reviewDate)}`,
      short: 'privilege review overdue',
      agentId: p.agentId,
      ruleTag: p.code,
      raisedAt: s.now,
      action: 'review the privilege',
      actionSub: p.evidence,
      ownerId: agent.sponsorId,
      copied: [agent.ownerId, ...(lead ? [lead] : [])],
      deadline: `${addDays(p.reviewDate, s.divisions.find((d) => d.id === agent.divisionId)?.graceDays ?? 14).slice(0, 10)}T17:00:00`,
      state: 'new',
      route: 'inbox',
    })
  }
  return s
}

/** The next version number of a privilege code: one past the highest ever used, closed versions included. */
export const nextVersion = (s: DemoState, code: string) => Math.max(0, ...s.privileges.filter((p) => p.code === code).map((p) => p.version)) + 1
