import { createSeed } from '../seed'
import type { DemoState } from '../types'

/** Named starting points for stories and demos (spec §6.3). Later phases add their own. */
export type ScenarioId = 'baseline' | 'med-rec-paused' | 'resume-requested' | 'awaiting-signature' | 'step-down-threshold'

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

/** Each scenario edits a fresh seed. */
export const scenarios: Record<ScenarioId, (seed: DemoState) => DemoState> = {
  baseline: (s) => s,

  // E6 6b: Marcus paused Med Rec Agent at 09:47.
  'med-rec-paused': pauseMedRec,

  // E6 6d / component sheet 08: Marcus asks to resume; Priya hasn't approved yet.
  'resume-requested': (s) => {
    pauseMedRec(s)
    s.now = '2026-12-08T12:01:00'
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
}

/** A fresh state for the scenario. */
export function buildScenario(id: ScenarioId): DemoState {
  return scenarios[id](createSeed())
}
