import type { DemoState } from '../types'
import { dropAgents, rewindTo } from './rewind'

/**
 * Med Rec Agent's onboarding, replayed (ruling R1). Each stage rewinds the hospital to the
 * frame's moment, removes Med Rec, then replays the dated steps up to that stage through the
 * store's own mutations, so a frame's state is exactly what the UI would produce.
 */

export type MedRecStage = 'intake'

const STAGES: MedRecStage[] = ['intake']

/** "Now" in each stage's frame. */
const NOW: Record<MedRecStage, string> = {
  intake: '2026-10-01T09:05:00',
}

/** A dated step and the first stage at which it has happened. */
interface Step {
  stage: MedRecStage
  run: (s: DemoState) => void
}

const TIMELINE: Step[] = []

/** The hospital before Med Rec Agent existed, with REQ-0093 approved and waiting. */
function beforeMedRec(s: DemoState, at: string): DemoState {
  rewindTo(s, at)
  dropAgents(s, new Set(['med-rec']))
  const intake = s.intakeRequests.find((r) => r.id === 'req-0093')
  if (intake) delete intake.startedAt
  return s
}

/** Med Rec's onboarding as it stood at `stage`. */
export const medRecAt =
  (stage: MedRecStage) =>
  (s: DemoState): DemoState => {
    beforeMedRec(s, NOW[stage])
    const upTo = STAGES.indexOf(stage)
    for (const step of TIMELINE) if (STAGES.indexOf(step.stage) <= upTo) step.run(s)
    s.now = NOW[stage]
    return s
  }
