import { applyJobEdit, applyStart } from '../../store/onboarding'
import type { DemoState } from '../types'
import { dropAgents, rewindTo } from './rewind'

/**
 * Med Rec Agent's onboarding, replayed (ruling R1). Each stage rewinds the hospital to the
 * frame's moment, removes Med Rec, then replays the dated steps up to that stage through the
 * store's own mutations, so a frame's state is exactly what the UI would produce.
 */

export type MedRecStage = 'intake' | 'job-5-of-7'

const STAGES: MedRecStage[] = ['intake', 'job-5-of-7']

/** "Now" in each stage's frame. */
const NOW: Record<MedRecStage, string> = {
  intake: '2026-10-01T09:05:00',
  'job-5-of-7': '2026-10-04T08:41:00',
}

/** A dated step and the first stage at which it has happened. */
interface Step {
  stage: MedRecStage
  run: (s: DemoState) => void
}

const TIMELINE: Step[] = [
  // 1a: Dana starts onboarding with Marcus and Sam.
  { stage: 'job-5-of-7', run: (s) => applyStart(s, 'req-0093', { ownerId: 'marcus', techOwnerId: 'sam' }, 'dana', '2026-10-01T09:12:00') },
  // 1b: Marcus writes 5 of the 7 fields over two days, then leaves it at 16:42 on 03 Oct (v0.4).
  {
    stage: 'job-5-of-7',
    run: (s) =>
      applyJobEdit(
        s,
        'med-rec',
        {
          activities: [
            { id: 'med-rec-admission', name: 'Reconcile home medications at admission', branch: 'Adverse branch: stopping a home medication' },
            { id: 'med-rec-allergy', name: 'Flag allergy conflicts', branch: 'No adverse branch: flags only' },
          ],
        },
        'marcus',
        '2026-10-02T10:30:00',
      ),
  },
  { stage: 'job-5-of-7', run: (s) => applyJobEdit(s, 'med-rec', { never: ['Change a dose', 'Remove an allergy', 'Draft for anyone but the encounter’s patient'] }, 'marcus', '2026-10-02T15:05:00') },
  {
    stage: 'job-5-of-7',
    run: (s) => applyJobEdit(s, 'med-rec', { actingFor: 'The admitting pharmacist on the patient’s unit', targets: { agreement: 90, omitted: 3 } }, 'marcus', '2026-10-03T16:42:00'),
  },
]

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
