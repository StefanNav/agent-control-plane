import type { Agent, DemoState, PauseDetail } from '../data/types'

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

const nextCode = (codes: string[], prefix: string, width: number) => {
  const max = Math.max(0, ...codes.map((c) => Number(c.slice(prefix.length)) || 0))
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

/** "INC-0031" after INC-0030. */
export const nextIncidentCode = (s: DemoState) => nextCode(s.incidents.map((i) => i.code), 'INC-', 4)

/** "RET-07" after RET-06. */
export const nextArchiveCode = (s: DemoState) =>
  nextCode(s.agents.flatMap((a) => (a.retirement ? [a.retirement.code] : [])), 'RET-', 2)
