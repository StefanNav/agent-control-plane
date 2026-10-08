import { addMinutes } from '../../lib/clock'
import type { DemoState } from '../types'

const later = (at: string) => (t: string | undefined) => Boolean(t && t > at)

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
  const gone = new Set(s.onboardings.filter((r) => after(r.startedAt)).map((r) => r.agentId))
  s.onboardings = s.onboardings.filter((r) => !gone.has(r.agentId))
  s.agents = s.agents.filter((a) => !gone.has(a.id))
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

  for (const privilege of s.privileges) if (privilege.state === 'due' && privilege.reviewDate && privilege.reviewDate > at) privilege.state = 'active'
  s.stats24h = { ...s.stats24h, lastHour: { hardStops: 0, pauses: 0, pages: 0 } }
  return s
}
