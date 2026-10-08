import { addMinutes } from '../../lib/clock'
import { withdrawExpiredChanges } from '../../store/changes'
import { raiseOverdueReviews } from '../../store/mutations'
import { applyLapses } from '../../store/settings'
import type { DemoState } from '../types'

/**
 * Move the demo clock; heartbeats that were live (one minute before the old clock) stay live at the
 * new time, however many times the clock moves. Then what the clock passes takes effect, each step
 * idempotent: overdue reviews are raised (3d), lapse policies act (8a), expired held builds go (9a).
 */
export function advanceClock(s: DemoState, to: string): DemoState {
  const live = addMinutes(s.now, -1)
  const heartbeat = addMinutes(to, -1)
  for (const agent of s.agents) if (agent.monitor.lastSeen === live) agent.monitor.lastSeen = heartbeat
  for (const division of s.divisions) if (division.monitor.state === 'live') division.monitor.lastAt = heartbeat
  s.now = to
  raiseOverdueReviews(s)
  applyLapses(s)
  withdrawExpiredChanges(s)
  return s
}

/**
 * The days a story skips (9a, 10b): items raised before `before` were handled in the meantime by
 * whoever owned them. Incidents, overdue reviews and hand-offs with a link stay open.
 */
export function settleBefore(s: DemoState, before: string): DemoState {
  for (const e of s.exceptions) {
    if (e.state === 'resolved' || e.state === 'dismissed' || e.raisedAt >= before) continue
    if (e.kind === 'incident' || e.type === 'Review overdue' || e.link) continue
    Object.assign(e, { state: 'resolved', outcome: 'Handled', closedAt: `${e.raisedAt.slice(0, 10)}T17:00:00`, closedBy: e.ownerId })
  }
  // An agent whose items were all handled reads "Within scope" again; a stale feed was fixed.
  for (const agent of s.agents) {
    if (!['review', 'warn', 'stale'].includes(agent.judgment.status)) continue
    if (s.exceptions.some((e) => e.agentId === agent.id && e.state !== 'resolved' && e.state !== 'dismissed')) continue
    if (agent.judgment.status === 'stale') agent.monitor.lastSeen = addMinutes(s.now, -1)
    agent.judgment = { status: 'normal', label: 'Within scope' }
  }
  return s
}
