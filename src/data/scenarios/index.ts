import { createSeed } from '../seed'
import { addMinutes } from '../../lib/clock'
import { applyPause, raiseOverdueReviews } from '../../store/mutations'
import type { DemoState, Incident } from '../types'
import { medRecAt } from './onboarding'

/** Named starting points for stories and demos (spec §6.3). Later phases add their own. */
export type ScenarioId =
  | 'baseline'
  | 'med-rec-paused'
  | 'resume-requested'
  | 'awaiting-signature'
  | 'step-down-threshold'
  | 'stale-escalated'
  | 'onboarding-intake'
  | 'onboarding-at-5-of-7'
  | 'onboarding-systems'
  | 'onboarding-tools-tested'
  | 'onboarding-sponsor-review'
  | 'onboarding-returned-hs11'
  | 'onboarding-ready'
  | 'review-risk-tier'
  | 'review-committee'
  | 'review-decided'
  | 'shadow-day-21'

/** Every scenario id, for validating a `?scenario=` param. */
export const SCENARIO_IDS: readonly ScenarioId[] = [
  'baseline',
  'med-rec-paused',
  'resume-requested',
  'awaiting-signature',
  'step-down-threshold',
  'stale-escalated',
  'onboarding-intake',
  'onboarding-at-5-of-7',
  'onboarding-systems',
  'onboarding-tools-tested',
  'onboarding-sponsor-review',
  'onboarding-returned-hs11',
  'onboarding-ready',
  'review-risk-tier',
  'review-committee',
  'review-decided',
  'shadow-day-21',
]

/** The seed's live heartbeat (one minute before DEMO_NOW). */
const LIVE = '2026-12-08T09:51:00'

const medRec = (s: DemoState) => s.agents.find((a) => a.id === 'med-rec')!
const admissionPrivilege = (s: DemoState) => s.privileges.find((p) => p.activityId === 'med-rec-admission')!

const PAUSED_AT = '2026-12-08T09:47:00'

/** 6b: Marcus paused the whole agent at 09:47, with a reason; 12 drafts went back to pharmacists. */
function pauseMedRec(s: DemoState): DemoState {
  return applyPause(s, ['med-rec'], { scope: 'agent', reason: 'HS-04 blocked 3 dose changes since 09:00. Pausing until we know why.' }, 'marcus', PAUSED_AT)
}

/** Move the demo clock; heartbeats that were live stay live at the new time. */
function advanceClock(s: DemoState, to: string): DemoState {
  const heartbeat = addMinutes(to, -1)
  for (const agent of s.agents) if (agent.monitor.lastSeen === LIVE) agent.monitor.lastSeen = heartbeat
  for (const division of s.divisions) if (division.monitor.state === 'live') division.monitor.lastAt = heartbeat
  s.now = to
  // A review date the clock moves past raises its overdue review (3d).
  raiseOverdueReviews(s)
  return s
}

/** E7 7c's incident, as it stands at 11:58 (before Priya approves at 13:10). */
const INC_0031: Incident = {
  id: 'inc-0031',
  code: 'INC-0031',
  title: 'Dose changes proposed on admission drafts',
  agentId: 'med-rec',
  state: 'corrections',
  openedAt: '2026-12-08T10:05:00',
  openedBy: 'jordan',
  commanderId: 'marcus',
  harm: 'None reached a patient',
  summary: 'Med Rec Agent proposed dose changes on 3 admissions between 09:02 and 09:38. HS-04 v2 blocked all 3; pharmacists kept the home doses.',
  linkedActionIds: ['act-88213', 'act-88199', 'act-88171'],
  rootCause: {
    text: 'When a fill was newer than the home list, SOP v1.3.1 took the strength from the fill, not the formulary table. The agent then “corrected” the home dose to match the fill.',
    by: 'sam',
  },
  corrections: [
    { id: 'c1', text: 'SOP v1.3.2 reads strength from the formulary table', ownerId: 'sam', done: true, status: 'Deployed 11:52' },
    { id: 'c2', text: 'Replay 23 cases, including the 3 linked', ownerId: 'marcus', done: true, status: 'HS-04 fired 0' },
    { id: 'c3', text: 'HS-04 v2 unchanged: it worked', ownerId: 'sam', done: true, status: 'Reviewed' },
    { id: 'c4', text: 'Add a “newer fill” case set to re-validation', sub: 'So a future SOP change is tested against it', ownerId: 'marcus', done: false, status: 'Due 15 Dec' },
  ],
  timeline: [
    { at: '2026-12-08T09:02:00', title: 'First dose change blocked', sub: 'ACT-88171 · enc 4403' },
    { at: '2026-12-08T09:38:00', title: 'Third dose change blocked', sub: 'ACT-88213 · enc 4417' },
    { at: '2026-12-08T09:42:00', title: 'Exception to Marcus', sub: 'EXC-5530 · review' },
    { at: '2026-12-08T09:47:00', title: 'Marcus paused the agent', sub: '12 drafts to pharmacists', by: 'marcus' },
    { at: '2026-12-08T10:05:00', title: 'Jordan opened this incident', sub: 'Linked 3 actions', by: 'jordan' },
    { at: '2026-12-08T11:40:00', title: 'Root cause found', sub: 'Sam', by: 'sam' },
    { at: '2026-12-08T11:58:00', title: 'Resume requested', sub: 'Marcus', by: 'marcus' },
  ],
}

/** Each scenario edits a fresh seed. */
export const scenarios: Record<ScenarioId, (seed: DemoState) => DemoState> = {
  baseline: (s) => s,

  // E6 6b: Marcus paused Med Rec Agent at 09:47.
  'med-rec-paused': pauseMedRec,

  // E6 6d/6e and E7 7c: 11:58. Marcus paused at 09:47; Jordan opened INC-0031 at 10:05; Sam found the
  // root cause and shipped SOP v1.3.2; Marcus asks to resume. Priya hasn't approved yet.
  'resume-requested': (s) => {
    advanceClock(s, '2026-12-08T11:58:00')
    pauseMedRec(s)
    medRec(s).pause!.changes = [
      { title: 'SOP v1.3.1 → v1.3.2', sub: 'Dose strength read from the formulary table', meta: 'Sam · 11:52' },
      { title: 'Replay · 23 cases', sub: 'Today’s 3 blocked cases and 20 random admissions', meta: 'HS-04 fired 0' },
      { title: 'Incident INC-0031', sub: 'Root cause recorded · 1 correction open', meta: 'Marcus' },
    ]
    s.incidents.push(INC_0031)
    const reason =
      'Dose mapping fixed in SOP v1.3.2: strengths now come from the formulary table, not the latest fill. Replayed today’s 3 blocked cases and 20 more; HS-04 fired 0 times.'
    s.resumeRequests.push({
      agentId: 'med-rec',
      requestedBy: 'marcus',
      requestedAt: s.now,
      reason,
      approvals: [{ personId: 'marcus', reason, at: s.now }],
    })
    return s
  },

  // E3 3c / Countersign Screens 1b: 06 Nov 09:52, PRV-0142 v3 waits for Priya, Shadow → Draft (R17).
  'awaiting-signature': medRecAt('awaiting-signature'),

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

  // E1 1a / E2 2a: 01 Oct, REQ-0093 approved on 29 Sep and not started; Med Rec doesn't exist yet.
  'onboarding-intake': medRecAt('intake'),

  // E1 1b / 1i: 04 Oct 08:41, Marcus returns to the job description he left at 5 of 7.
  'onboarding-at-5-of-7': medRecAt('job-5-of-7'),

  // E1 1c: 05 Oct 11:09, Marcus has ticked the grid; Teams · write still needs its activity.
  'onboarding-systems': medRecAt('systems-3-of-4'),

  // E1 1d: 06 Oct 14:21, Sam has tested all three hard stops; Send to Priya unlocks.
  'onboarding-tools-tested': medRecAt('tools-tested'),

  // E1 1e / 1f: 07 Oct 09:05, the final set waits for Priya since 06 Oct 15:10.
  'onboarding-sponsor-review': medRecAt('sponsor-review'),

  // E1 1g: 07 Oct 09:31, Priya sent HS-11 back to Sam at 09:14; her review resets.
  'onboarding-returned-hs11': medRecAt('returned-hs11'),

  // E1 1h: 07 Oct 16:05, Priya signed at 16:02; the record is frozen at v1.0 and with AIMS Review.
  'onboarding-ready': medRecAt('ready'),

  // E2 2b: 13 Oct 10:15, Dana sets the risk tier; the suggestion is Tier 2.
  'review-risk-tier': medRecAt('risk-tier'),

  // E2 2c: 14 Oct 16:12, Dr. Lee has the Tier 3 packet (item 3 of 5).
  'review-committee': medRecAt('committee'),

  // E2 2d: 14 Oct 16:25, approved with conditions C1–C3 at 16:20; shadow starts 15 Oct.
  'review-decided': medRecAt('decided'),

  // E3 3a / 3b: 05 Nov 09:30, shadow ran 15 Oct to 04 Nov; 2 of 3 targets met.
  'shadow-day-21': medRecAt('shadow-day-21'),
}

/** A fresh state for the scenario. */
export function buildScenario(id: ScenarioId): DemoState {
  return scenarios[id](createSeed())
}
