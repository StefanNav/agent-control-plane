import { addMinutes } from '../../lib/clock'
import { raiseOverdueReviews } from '../../store/mutations'
import { applyLapses } from '../../store/settings'
import type { DemoState } from '../types'

/** The seed's live heartbeat (one minute before DEMO_NOW). */
const LIVE = '2026-12-08T09:51:00'

/**
 * Move the demo clock; heartbeats that were live stay live at the new time. Then what the clock
 * passes takes effect, each step idempotent: overdue reviews are raised (3d) and lapse policies act (8a).
 */
export function advanceClock(s: DemoState, to: string): DemoState {
  const heartbeat = addMinutes(to, -1)
  for (const agent of s.agents) if (agent.monitor.lastSeen === LIVE) agent.monitor.lastSeen = heartbeat
  for (const division of s.divisions) if (division.monitor.state === 'live') division.monitor.lastAt = heartbeat
  s.now = to
  raiseOverdueReviews(s)
  applyLapses(s)
  return s
}
