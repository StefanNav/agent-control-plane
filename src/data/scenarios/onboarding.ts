import { applyJobEdit, applyRequestChanges, applySend, applySponsorSign, applyStart, applySystemsEdit, applyTest } from '../../store/onboarding'
import type { DemoState, Verb } from '../types'
import { dropAgents, rewindTo } from './rewind'

/**
 * Med Rec Agent's onboarding, replayed (ruling R1). Each stage rewinds the hospital to the
 * frame's moment, removes Med Rec, then replays the dated steps up to that stage through the
 * store's own mutations, so a frame's state is exactly what the UI would produce.
 */

export type MedRecStage = 'intake' | 'job-5-of-7' | 'systems-3-of-4' | 'tools-tested' | 'sponsor-review' | 'returned-hs11' | 'ready'

const STAGES: MedRecStage[] = ['intake', 'job-5-of-7', 'systems-3-of-4', 'tools-tested', 'sponsor-review', 'returned-hs11', 'ready']

/** "Now" in each stage's frame. */
const NOW: Record<MedRecStage, string> = {
  intake: '2026-10-01T09:05:00',
  'job-5-of-7': '2026-10-04T08:41:00',
  'systems-3-of-4': '2026-10-05T11:09:00',
  'tools-tested': '2026-10-06T14:21:00',
  'sponsor-review': '2026-10-07T09:05:00',
  'returned-hs11': '2026-10-07T09:31:00',
  ready: '2026-10-07T16:05:00',
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
  // 1b → 1c: Marcus finishes the job on 04 Oct (v0.5).
  {
    stage: 'systems-3-of-4',
    run: (s) =>
      applyJobEdit(
        s,
        'med-rec',
        { escalation: ['Home list and fill history disagree', 'Patient on dialysis', 'More than 15 home medications'], targets: { inaccurate: 2 } },
        'marcus',
        '2026-10-04T09:05:00',
      ),
  },
  // 1c: on 05 Oct Marcus ticks the grid and explains every grant but Teams · write (v0.6).
  { stage: 'systems-3-of-4', run: (s) => grantMedRecSystems(s, '2026-10-05T11:08:00') },
  // 1c → 1d: Teams · write serves escalation; the grid is done on 05 Oct (v0.7), and Sam gets the hard stops.
  { stage: 'tools-tested', run: (s) => applySystemsEdit(s, 'med-rec', { kind: 'reason', system: 'Microsoft Teams', verb: 'write', activity: 'escalation' }, 'marcus', '2026-10-05T11:12:00') },
  // 1d: Sam tests all three on the last 30 days.
  { stage: 'tools-tested', run: (s) => applyTest(s, 'med-rec', 'HS-04', undefined, 'sam', '2026-10-06T14:20:00') },
  { stage: 'tools-tested', run: (s) => applyTest(s, 'med-rec', 'HS-07', undefined, 'sam', '2026-10-06T14:20:00') },
  { stage: 'tools-tested', run: (s) => applyTest(s, 'med-rec', 'HS-11', undefined, 'sam', '2026-10-06T14:21:00') },
  // Pin: the frames number Sam's autosaves v0.9 from here on (ruling R8: tests don't bump the version).
  { stage: 'tools-tested', run: (s) => void (s.onboardings.find((r) => r.agentId === 'med-rec')!.version = 9) },
  // 1d → 1e: Sam sends the set to Priya at 15:10.
  { stage: 'sponsor-review', run: (s) => applySend(s, 'med-rec', 'sam', '2026-10-06T15:10:00') },
  // 1f → 1g: Priya sends HS-11 back to Sam the next morning.
  { stage: 'returned-hs11', run: (s) => applyRequestChanges(s, 'med-rec', { to: 'sam', about: 'HS-11', note: HS11_NOTE }, 'priya', '2026-10-07T09:14:00') },
  // Pin: 1g reads "Autosaved 09:31" (Sam had the step open).
  { stage: 'returned-hs11', run: (s) => void (s.onboardings.find((r) => r.agentId === 'med-rec')!.savedAt = '2026-10-07T09:31:00') },
  // 1g → 1h: Sam re-tests HS-11 on the 212 transfers and sends again; Priya signs at 16:02.
  { stage: 'ready', run: (s) => applyTest(s, 'med-rec', 'HS-11', 'sep-8east-transfers', 'sam', '2026-10-07T10:40:00') },
  { stage: 'ready', run: (s) => applySend(s, 'med-rec', 'sam', '2026-10-07T10:45:00') },
  { stage: 'ready', run: (s) => applySponsorSign(s, 'med-rec', 'priya', '2026-10-07T16:02:00') },
]

/** Priya's note on HS-11 (1f, verbatim). */
export const HS11_NOTE = 'HS-11 shows 0 blocks. Before I sign, please test it on September’s 8 East transfers. That’s where a wrong-patient draft would happen.'

/** 1c's grid in one autosave: Epic read and draft, worklist read and write, Pyxis read, Teams write (unexplained). */
function grantMedRecSystems(s: DemoState, at: string) {
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  const grants: Array<[string, Verb, string | null, string]> = [
    ['Epic', 'read', 'all', 'Both activities: home list, allergies, fill history'],
    ['Epic', 'draft', 'med-rec-admission', 'Reconcile home medications. The draft lands in Epic as pending, for the pharmacist to sign.'],
    ['Pharmacy worklist', 'read', null, ''],
    ['Pharmacy worklist', 'write', 'med-rec-admission', 'Puts the draft in the admitting pharmacist’s queue'],
    ['Pyxis', 'read', 'med-rec-admission', 'Dispense history, to check the home list'],
    ['Microsoft Teams', 'write', null, ''],
  ]
  record.grants = grants.map(([system, verb, activity, why]) => ({ system, verb, activity, why, added: at }))
  // One autosave, counted through the store's own edit so version and done follow its rules.
  applySystemsEdit(s, 'med-rec', { kind: 'grant', system: 'Microsoft Teams', verb: 'write', on: true }, 'marcus', at)
}

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
