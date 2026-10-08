import { createSeed } from '../seed'
import { addMinutes } from '../../lib/clock'
import type { DemoState } from '../types'

/** Named starting points for stories and demos (spec §6.3). Later phases add their own. */
export type ScenarioId = 'baseline' | 'med-rec-paused' | 'resume-requested' | 'awaiting-signature' | 'step-down-threshold' | 'stale-escalated'

/** Every scenario id, for validating a `?scenario=` param. */
export const SCENARIO_IDS: readonly ScenarioId[] = ['baseline', 'med-rec-paused', 'resume-requested', 'awaiting-signature', 'step-down-threshold', 'stale-escalated']

/** The seed's live heartbeat (one minute before DEMO_NOW). */
const LIVE = '2026-12-08T09:51:00'

const medRec = (s: DemoState) => s.agents.find((a) => a.id === 'med-rec')!
const admissionPrivilege = (s: DemoState) => s.privileges.find((p) => p.activityId === 'med-rec-admission')!

function pauseMedRec(s: DemoState): DemoState {
  Object.assign(medRec(s), {
    lifecycle: 'paused',
    pausedBy: 'marcus',
    pausedAt: '2026-12-08T09:47:00',
    judgment: { status: 'paused', label: 'Paused by Marcus' },
  })
  return s
}

/** Move the demo clock; heartbeats that were live stay live at the new time. */
function advanceClock(s: DemoState, to: string): DemoState {
  const heartbeat = addMinutes(to, -1)
  for (const agent of s.agents) if (agent.monitor.lastSeen === LIVE) agent.monitor.lastSeen = heartbeat
  for (const division of s.divisions) if (division.monitor.state === 'live') division.monitor.lastAt = heartbeat
  s.now = to
  return s
}

/** Each scenario edits a fresh seed. */
export const scenarios: Record<ScenarioId, (seed: DemoState) => DemoState> = {
  baseline: (s) => s,

  // E6 6b: Marcus paused Med Rec Agent at 09:47.
  'med-rec-paused': pauseMedRec,

  // E6 6d / component sheet 08: Marcus asks to resume 2 h 14 min after pausing; Priya hasn't approved yet.
  // The clock stays at 09:52 so the rest of the hospital reads as live.
  'resume-requested': (s) => {
    pauseMedRec(s)
    medRec(s).pausedAt = '2026-12-08T07:38:00'
    s.resumeRequests.push({
      agentId: 'med-rec',
      requestedBy: 'marcus',
      requestedAt: s.now,
      reason:
        'Wrong-patient root cause fixed in v1.3.1: encounter match is now checked before and after drafting. 20 replayed cases clean.',
      approvals: [],
    })
    return s
  },

  // E3 3c / Countersign Screens 1b: PRV-0142 v3 waits for Priya, Shadow → Draft.
  'awaiting-signature': (s) => {
    Object.assign(admissionPrivilege(s), {
      state: 'awaiting',
      level: 'shadow',
      proposedLevel: 'draft',
      grantedBy: undefined,
      grantedAt: undefined,
    })
    s.activities.find((a) => a.id === 'med-rec-admission')!.level = 'shadow'
    return s
  },

  // E15 15a: a threshold breach drops admission med rec from Draft to Shadow.
  'step-down-threshold': (s) => {
    s.activities.find((a) => a.id === 'med-rec-admission')!.level = 'shadow'
    Object.assign(admissionPrivilege(s), {
      state: 'steppedDown',
      level: 'shadow',
      movedBy: 'MR-12 v1',
      trigger: 'Edit rate above 15% for 3 days',
    })
    return s
  },

  // E5 5d: 12:00. Nobody answered the stale-monitor item by 10:46, so it escalated to Priya;
  // Marcus claimed the Med Rec review at 09:55, so that one did not.
  'stale-escalated': (s) => {
    advanceClock(s, '2026-12-08T12:00:00')
    Object.assign(s.exceptions.find((e) => e.id === 'exc-5530')!, { claimedAt: '2026-12-08T09:55:00', state: 'claimed' })
    return s
  },
}

/** A fresh state for the scenario. */
export function buildScenario(id: ScenarioId): DemoState {
  return scenarios[id](createSeed())
}
