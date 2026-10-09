import { createSeed } from '../seed'
import { applyPause } from '../../store/mutations'
import { DEMO_NOW } from '../../lib/clock'
import { applyAccept, applyDeploy, applyHardStopApproval, applyReplay, applySystemsSignOff, changeId } from '../../store/changes'
import { applyAddEpicDraft, applyFlag, applyFlagAnswer } from '../../store/feedback'
import { applySignPromotion } from '../../store/promotions'
import { applyThresholdStepDown } from '../../store/stepdowns'
import { STEP_DOWN_MED_REC } from '../seed/autonomy'
import { ACT_89012, DR_90455 } from '../seed/feedback'
import { V150 } from '../seed/catalogue'
import { advanceClock, settleBefore } from './clock'
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
  | 'change-detected-v150'
  | 'epic-fixed-later'
  | 'promotion-at-board'

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
  'change-detected-v150',
  'epic-fixed-later',
  'promotion-at-board',
]

const medRec = (s: DemoState) => s.agents.find((a) => a.id === 'med-rec')!

const PAUSED_AT = '2026-12-08T09:47:00'

/** 6b: Marcus paused the whole agent at 09:47, with a reason; 12 drafts went back to pharmacists. */
function pauseMedRec(s: DemoState): DemoState {
  return applyPause(s, ['med-rec'], { scope: 'agent', reason: 'HS-04 blocked 3 dose changes since 09:00. Pausing until we know why.' }, 'marcus', PAUSED_AT)
}


/** 9a's deploy, re-dated from 24 Mar 09:12 (R1). */
export const V150_DEPLOY = '2026-12-15T09:12:00'

/**
 * 9a (R1, R12): Ana flags the frequency split at baseline and Marcus answers it; a week passes, then
 * Sam deploys v1.5.0 at 09:12 on 15 Dec and the gateway holds it. Duplicate Rx has lapsed by then.
 */
export function changeDetected(s: DemoState): DemoState {
  applyFlag(s, { draftId: 'DR-88412', reason: 'frequency', note: 'Frequency split into two lines' }, 'ana', DEMO_NOW)
  const item = s.flags.at(-1)!.exceptionId!
  applyFlagAnswer(s, item, { kind: 'inProgress', text: 'Sam is changing how the frequency is read' }, 'marcus', '2026-12-08T10:30:00')
  advanceClock(s, V150_DEPLOY)
  settleBefore(s, '2026-12-15T00:00:00')
  applyDeploy(s, V150, V150_DEPLOY, 'sam')
  return advanceClock(s, '2026-12-15T09:52:00')
}

/**
 * 10b (R1, spec "+9 days"): from 9a, Marcus replays and signs off, Priya approves HS-04 v3, Marcus
 * accepts v1.5.0 on 16 Dec 08:30 and thanks Ana; on 17 Dec Okafor's draft is made by v1.5.0.
 */
export function epicFixedLater(s: DemoState): DemoState {
  changeDetected(s)
  const id = changeId('med-rec', V150.build)
  applyReplay(s, id, 'marcus', '2026-12-15T10:20:00')
  applySystemsSignOff(s, id, 'marcus', '2026-12-15T10:25:00')
  applyHardStopApproval(s, id, 'priya', '2026-12-15T14:05:00')
  applyAccept(s, id, 'marcus', '2026-12-16T08:30:00')
  const flag = s.flags.find((f) => f.code === 'FB-2291')!
  flag.reply = { by: 'marcus', text: 'Thanks. This caused the edit-rate jump on 7 West.', at: '2026-12-16T08:35:00' }
  advanceClock(s, '2026-12-17T08:14:00')
  settleBefore(s, '2026-12-17T00:00:00')
  applyAddEpicDraft(s, DR_90455, ACT_89012)
  return advanceClock(s, '2026-12-17T09:52:00')
}

/** 14a's reason, verbatim. */
export const PRIYA_PROMOTION_REASON = 'Adding an outside allergy only makes prescribing more cautious. 90 days of evidence, every criterion met, and step-down on any defect.'

/**
 * 14b (R1, R17): Priya signs PRM-0007 at 10:20 on 08 Dec; it is Tier 3, so it goes to the board,
 * which meets at 15:00 the next day. Dr. Lee opens it at 15:10.
 */
export function promotionAtBoard(s: DemoState): DemoState {
  applySignPromotion(s, 'prm-0007', PRIYA_PROMOTION_REASON, 'priya', '2026-12-08T10:20:00')
  advanceClock(s, '2026-12-09T15:10:00')
  return settleBefore(s, '2026-12-09T00:00:00')
}

/**
 * 15a (R1, R12, R17): the edit rate on admission med rec was above 15 % on 07, 08 and 09 Dec, so at
 * 06:00 on 09 Dec the trigger on PRV-0142 fires at the gateway. Marcus opens it at 09:52.
 */
export function stepDownThreshold(s: DemoState): DemoState {
  advanceClock(s, STEP_DOWN_MED_REC.at)
  settleBefore(s, '2026-12-09T00:00:00')
  applyThresholdStepDown(s, STEP_DOWN_MED_REC.activityId, { trigger: STEP_DOWN_MED_REC.trigger, routed: STEP_DOWN_MED_REC.routed }, STEP_DOWN_MED_REC.at)
  return advanceClock(s, '2026-12-09T09:52:00')
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

  // E15 15a (R1, R17): the next morning, a threshold breach drops admission med rec from Draft to Shadow.
  'step-down-threshold': stepDownThreshold,

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
  'change-detected-v150': changeDetected,
  'epic-fixed-later': epicFixedLater,
  'promotion-at-board': promotionAtBoard,
}

/** A fresh state for the scenario. */
export function buildScenario(id: ScenarioId): DemoState {
  return scenarios[id](createSeed())
}
