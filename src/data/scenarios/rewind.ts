import { addDays, addMinutes } from '../../lib/clock'
import { TIER_RULES } from '../seed/catalogue'
import type { DemoState } from '../types'

const later = (at: string) => (t: string | undefined) => Boolean(t && t > at)

/** Remove agents and everything that belongs to them. */
export function dropAgents(s: DemoState, ids: Set<string>): DemoState {
  const keep = <T extends { agentId?: string }>(items: T[]) => items.filter((i) => !i.agentId || !ids.has(i.agentId))
  const activities = new Set(s.activities.filter((a) => ids.has(a.agentId)).map((a) => a.id))
  s.agents = s.agents.filter((a) => !ids.has(a.id))
  s.activities = keep(s.activities)
  s.privileges = keep(s.privileges)
  s.grants = keep(s.grants)
  s.hardStops = keep(s.hardStops)
  s.instructions = keep(s.instructions)
  s.onboardings = keep(s.onboardings)
  s.scorecards = s.scorecards.filter((c) => !activities.has(c.activityId))
  s.sampleCases = keep(s.sampleCases)
  s.exceptions = keep(s.exceptions)
  s.actions = keep(s.actions)
  s.incidents = keep(s.incidents)
  s.logEvents = keep(s.logEvents)
  s.resumeRequests = keep(s.resumeRequests)
  return s
}

/**
 * The hospital as it stood at `at` (ruling R1). Anything dated later disappears: exceptions,
 * actions, incidents, events, exports, pauses, intakes and onboardings started since (with their
 * agents). Boards go calm and heartbeats are live. Agents' own history before `at` isn't
 * modelled, so their privileges stay; scenarios rebuild what a frame needs on top of this.
 * Mutates and returns the draft it's given.
 */
export function rewindTo(s: DemoState, at: string): DemoState {
  const after = later(at)
  const heartbeat = addMinutes(at, -1)
  s.now = at

  s.exceptions = s.exceptions.filter((e) => !after(e.raisedAt))
  s.actions = s.actions.filter((a) => !after(a.at))
  s.logEvents = s.logEvents.filter((e) => !after(e.at))
  s.changeEvents = s.changeEvents.filter((e) => !after(e.at))
  s.incidents = s.incidents.filter((i) => !after(i.openedAt))
  s.exports = s.exports.filter((e) => !after(e.at))
  s.resumeRequests = s.resumeRequests.filter((r) => !after(r.requestedAt))
  s.audit = s.audit.filter((e) => !after(e.at))
  s.intakeRequests = s.intakeRequests.filter((r) => !after(r.approvedAt))
  // Phase 6 data (review fix M9): callers first seen or decided later, flags, Epic drafts and changes.
  s.callers = s.callers.filter((c) => !after(c.firstSeen) && !after(c.decision?.at))
  s.flags = s.flags.filter((f) => !after(f.at))
  s.epicDrafts = s.epicDrafts.filter((d) => !after(d.draftedAt))
  s.changes = s.changes.filter((c) => !after(c.deployedAt))
  s.reviewChanges = s.reviewChanges.filter((c) => !after(c.at))
  // Phase 7 (R17): review levels as they stood that day; draws made since are gone.
  s.samplingDraws = s.samplingDraws.filter((d) => !after(d.drawnAt))
  s.promotions = s.promotions.filter((p) => !after(p.requestedAt))
  for (const record of s.reviewLevels) {
    record.changes = record.changes.filter((c) => !after(c.at))
    const activity = s.activities.find((a) => a.id === record.activityId)
    if (activity) activity.reviewLevel = record.changes.at(-1)?.to ?? 'normal'
  }
  dropAgents(s, new Set(s.onboardings.filter((r) => after(r.startedAt)).map((r) => r.agentId)))
  for (const intake of s.intakeRequests) if (after(intake.startedAt)) delete intake.startedAt

  for (const agent of s.agents) {
    if (agent.lifecycle === 'retired' || agent.lifecycle === 'onboarding' || agent.lifecycle === 'inReview') continue
    if (agent.lifecycle === 'paused' || agent.pausedAt) {
      agent.lifecycle = 'live'
      delete agent.pause
      delete agent.pausedBy
      delete agent.pausedAt
    }
    for (const activity of s.activities) if (activity.agentId === agent.id) delete activity.paused
    agent.judgment = agent.level === 'shadow' ? { status: 'shadow', label: 'Shadow' } : { status: 'normal', label: 'Within scope' }
    agent.monitor.lastSeen = heartbeat
    if (agent.judgedAt) agent.judgedAt = heartbeat
  }

  for (const division of s.divisions) {
    division.monitor = { state: 'live', lastAt: heartbeat }
    delete division.page
    delete division.incidentId
    delete division.note
    delete division.resumeNeeds
    delete division.closedThisWeek
    division.exceptionsByDay = division.exceptionsByDay.map(() => 0)
  }

  // A privilege signed after `at` stands for its previous signing: roll it back one review cycle at a time.
  for (const privilege of s.privileges) {
    const tier = s.agents.find((a) => a.id === privilege.agentId)?.riskTier ?? 2
    const cycle = TIER_RULES[tier].reviewDays + 1
    while (privilege.grantedAt && privilege.grantedAt > at) {
      privilege.grantedAt = addDays(privilege.grantedAt, -cycle)
      if (privilege.reviewDate) privilege.reviewDate = addDays(privilege.reviewDate, -cycle)
      if (privilege.version > 1) privilege.version -= 1
    }
  }
  for (const privilege of s.privileges) if (privilege.state === 'due' && privilege.reviewDate && privilege.reviewDate > at) privilege.state = 'active'
  s.stats24h = { ...s.stats24h, lastHour: { hardStops: 0, pauses: 0, pages: 0 } }
  return s
}
