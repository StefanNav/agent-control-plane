import type { AgentAction, EpicDraft, Flag } from '../types'
import { E10_SHIFT, fromMarch } from './redate'

const d = (iso: string) => fromMarch(iso, E10_SHIFT)

/**
 * 10a: Ana's draft for this admission, in the Epic stand-in (R1: 17 Mar → 08 Dec). The frame drafts
 * it at 10:32, after the 09:52 clock, so it is drafted at 09:32. Her metoprolol edit is seeded (R13).
 */
export const DR_88412: EpicDraft = {
  id: 'DR-88412',
  agentId: 'med-rec',
  build: 'v1.3.0',
  draftedAt: '2026-12-08T09:32:00',
  patient: { name: 'Harper, Lillian', age: 78, sex: 'F', mrn: '00412873', unit: '7 West', bed: '712-B', allergy: 'penicillin', admittedAt: d('2027-03-17T06:40:00') },
  lines: [
    {
      med: 'Metoprolol tartrate 25 mg',
      form: 'tab',
      dose: '25 mg',
      route: 'PO',
      frequency: 'BID',
      lastTaken: d('2027-03-17T08:00:00'),
      source: 'Outside fill',
      sourceAt: d('2027-03-02T00:00:00'),
      edit: { field: 'frequency', from: 'every 12 h + BID', to: 'BID', by: 'ana' },
    },
    { med: 'Apixaban 5 mg', form: 'tab', dose: '5 mg', route: 'PO', frequency: 'BID', lastTaken: d('2027-03-16T20:00:00'), source: 'Outside fill', sourceAt: d('2027-02-28T00:00:00') },
    { med: 'Atorvastatin 40 mg', form: 'tab', dose: '40 mg', route: 'PO', frequency: 'Nightly', lastTaken: d('2027-03-16T21:00:00'), source: 'Epic list', sourceAt: d('2027-01-11T00:00:00') },
    { med: 'Furosemide 20 mg', form: 'tab', dose: '20 mg', route: 'PO', frequency: 'Daily', lastTaken: d('2027-03-17T07:30:00'), source: 'Admission interview' },
    { med: 'Latanoprost 0.005 %', form: 'drops', dose: '1 drop', route: 'Each eye', frequency: 'Nightly', lastTaken: d('2027-03-16T21:00:00'), source: 'Outside fill', sourceAt: d('2027-02-09T00:00:00') },
    { med: 'Sertraline 50 mg', form: 'tab', dose: '50 mg', route: 'PO', frequency: 'Daily', lastTaken: d('2027-03-17T07:30:00'), source: 'Epic list', sourceAt: d('2027-01-11T00:00:00') },
  ],
  sources: 'Outside pharmacy fills · Epic home med list · admission interview note',
  did: 'Matched 6 medications, marked 1 possible duplicate, changed no doses (HS-04)',
  actionId: 'act-88209',
}

export const epicDrafts: EpicDraft[] = [DR_88412]

const FREQUENCY_FIX = 'Sam is changing how the frequency is read'

/** A frequency-split flag from another pharmacist since the Epic upgrade on 05 Dec (9a's "and 5 more"). */
const split = (n: number, byName: string, unit: string, at: string, draftId: string): Flag => ({
  id: `fb-${n}`,
  code: `FB-${n}`,
  draftId,
  agentId: 'med-rec',
  byName,
  unit,
  at,
  reason: 'frequency',
  title: 'Frequency split into two lines',
  status: 'inProgress',
  progress: FREQUENCY_FIX,
})

/**
 * Flags sent before 08 Dec, all already answered so 5a's "Needs me · 4" holds (R14). Ana's eye-drops
 * flag is FB-2286, not 10b/11b's FB-2302: in one timeline it comes before her 08 Dec flag (R2).
 */
export const flags: Flag[] = [
  {
    id: 'fb-2277',
    code: 'FB-2277',
    draftId: 'DR-87650',
    agentId: 'med-rec',
    byId: 'ana',
    byName: 'Ana R.',
    unit: '7 West',
    at: '2026-11-20T14:10:00',
    reason: 'duplicate',
    title: 'Duplicate apixaban line',
    status: 'notDefect',
    notDefect: 'Two fills from different pharmacies; the agent listed both and marked the duplicate for you.',
  },
  split(2283, 'J. Park', '7 West', '2026-12-05T10:12:00', 'DR-88104'),
  split(2284, 'L. Moreno', '8 East', '2026-12-05T15:40:00', 'DR-88131'),
  {
    id: 'fb-2286',
    code: 'FB-2286',
    draftId: 'DR-89802',
    agentId: 'med-rec',
    byId: 'ana',
    byName: 'Ana R.',
    unit: '6 North',
    at: '2026-12-03T19:40:00',
    reason: 'missed',
    title: 'Missed eye drops from an outside record',
    status: 'inProgress',
    progress: 'Adding Pyxis dispense history as a source',
  },
  split(2287, 'D. Shah', '8 East', '2026-12-06T08:25:00', 'DR-88207'),
  split(2289, 'R. Kim', '7 West', '2026-12-07T11:05:00', 'DR-88290'),
  split(2290, 'T. Bauer', '8 East', '2026-12-08T07:55:00', 'DR-88376'),
]

/** 10b: nine days later, Okafor's draft by v1.5.0 (R1: 26 Mar → 17 Dec). Added by `epic-fixed-later`. */
export const DR_90455: EpicDraft = {
  id: 'DR-90455',
  agentId: 'med-rec',
  build: 'v1.5.0',
  draftedAt: '2026-12-17T08:14:00',
  patient: { name: 'Okafor, James', age: 66, sex: 'M', mrn: '00419920', unit: '8 East', bed: '804-A', allergy: 'none known', admittedAt: d('2027-03-26T05:55:00') },
  lines: [
    { med: 'Lisinopril 10 mg', form: 'tab', dose: '10 mg', route: 'PO', frequency: 'Daily', lastTaken: d('2027-03-26T08:00:00'), source: 'Outside fill', sourceAt: d('2027-03-12T00:00:00') },
    { med: 'Metformin 500 mg', form: 'tab', dose: '1,000 mg', route: 'PO', frequency: 'BID', lastTaken: d('2027-03-26T07:45:00'), source: 'Outside fill', sourceAt: d('2027-03-12T00:00:00') },
    { med: 'Amlodipine 5 mg', form: 'tab', dose: '5 mg', route: 'PO', frequency: 'Daily', lastTaken: d('2027-03-26T08:00:00'), source: 'Epic list', sourceAt: d('2027-02-03T00:00:00') },
    { med: 'Tamsulosin 0.4 mg', form: 'cap', dose: '0.4 mg', route: 'PO', frequency: 'Nightly', lastTaken: d('2027-03-25T21:00:00'), source: 'Admission interview' },
    { med: 'Insulin glargine', form: '100 unit/mL', dose: '18 units', route: 'SC', frequency: 'Nightly', lastTaken: d('2027-03-25T21:30:00'), source: 'Pyxis', sourceAt: d('2027-03-24T00:00:00') },
  ],
  sources: 'Outside pharmacy fills · Epic home med list · Pyxis dispense history · admission interview note',
  did: 'Matched 5 medications, changed no doses or frequencies (HS-04)',
  actionId: 'act-89012',
}

/** DR-90455's trace (invented): v1.5.0 reads the structured frequency and Pyxis. */
export const ACT_89012: AgentAction = {
  id: 'act-89012',
  code: 'ACT-89012',
  at: '2026-12-17T08:14:00',
  title: 'Draft med list · enc 4602',
  agentId: 'med-rec',
  agentVersion: 'v1.5.0',
  sop: 'v1.5',
  actingFor: 'Ana R., PharmD · 8 East',
  reviewerOutcome: 'Waiting for review',
  context: { privilege: 'PRV-0142 v3 · Draft', checks: 3, conditions: ['C1 · pharmacist signs', 'C3 · dialysis excluded'] },
  steps: [
    { at: '2026-12-17T08:13:20.114', kind: 'input', title: 'Admission · enc 4602 · 8 East', meta: 'Epic ADT' },
    { at: '2026-12-17T08:13:22.630', kind: 'tool', title: 'epic.medlist.read', detail: 'Epic home med list · structured sig' },
    { at: '2026-12-17T08:13:24.902', kind: 'tool', title: 'pyxis.dispense.read', detail: 'Pyxis dispense history · 30 days' },
    { at: '2026-12-17T08:13:51.205', kind: 'policyPassed', title: 'Patient matches the encounter', ruleTag: 'HS-11 v1' },
    { at: '2026-12-17T08:13:58.440', kind: 'policyPassed', title: 'No dose or frequency changed', ruleTag: 'HS-04 v3' },
    { at: '2026-12-17T08:14:00.310', kind: 'output', title: 'Draft med list · 5 lines', detail: 'Sent to the pharmacist’s worklist' },
  ],
}
