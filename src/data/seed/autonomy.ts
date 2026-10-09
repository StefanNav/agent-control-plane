import type { Branch, Promotion, ReviewLevelRecord, ReviewRules, SamplingDraw } from '../types'
import { formatDate } from '../../lib/clock'
import { E13_SHIFT, E15_SHIFT, fromMarch } from './redate'

/**
 * Earned autonomy (E13–E15): review levels, today's sample, the promotion and the step-downs.
 * 13a, 13b and 14a are drawn on 16 Mar 2027 and shown at 08 Dec (R1, `E13_SHIFT`); dates here are
 * the frames' own, shifted, so each stays traceable to its frame.
 */
const d = (iso: string) => fromMarch(iso, E13_SHIFT)

/** The rules every activity starts with (13a's numbers). The sponsor may edit them. */
export const TEMPLATE_RULES: ReviewRules = {
  reduce: { days: 30, checks: 300, editRate: 5 },
  restore: { editRate: 5, days: 2 },
  tighten: { defects: 2, batches: 5 },
  relax: { batches: 5 },
}

/** Allergy Recon's three branches (14a); only the first only adds caution (R10). */
export const ALLERGY_BRANCHES: Branch[] = [
  { id: 'outside-records', name: 'Add an allergy from outside records', favourable: true, sub: 'Only adds caution; nothing is removed' },
  { id: 'update-reaction', name: 'Update a reaction or severity', favourable: false, sub: 'Can make an allergy look milder' },
  { id: 'remove-allergy', name: 'Remove an allergy', favourable: false, sub: 'Never, at any level', lockedBy: 'HS-07 v1' },
]

/** Allergy Recon's privilege code from 13a, 14a and 15b (R2); v1 was signed at Draft on 16 Dec → 09 Sep. */
export const PRV_0087 = { code: 'PRV-0087', version: 5, firstSignedAt: d('2026-12-16T10:00:00'), conditions: ['C1', 'C3'] }

/**
 * The activities with review-level records (R8). Allergy Recon is 13a verbatim; Duplicate Rx and
 * Vaccine History are invented, so 13b's "3 activities on Reduced review" holds.
 */
export const reviewLevels: ReviewLevelRecord[] = [
  {
    activityId: 'allergy-recon',
    rules: TEMPLATE_RULES,
    writtenBy: 'priya',
    writtenAt: d('2027-01-04T10:00:00'),
    since: PRV_0087.firstSignedAt,
    changes: [
      { at: d('2027-01-12T06:00:00'), from: 'normal', to: 'tightened', by: 'rule', why: '2 duplicate allergies with different spellings · fixed in SOP v1.2.1' },
      { at: d('2027-01-19T06:00:00'), from: 'tightened', to: 'normal', by: 'rule', why: '5 clean batches' },
      { at: d('2027-03-02T06:00:00'), from: 'normal', to: 'reduced', by: 'rule', why: 'Rule fired · 312 checks, 0 defects' },
    ],
    checks: 84,
    defects: 0,
    defectDays: [],
    fired: { checks: 312, defects: 0 },
  },
  {
    activityId: 'duplicate-rx',
    rules: TEMPLATE_RULES,
    writtenBy: 'priya',
    writtenAt: d('2027-01-04T10:00:00'),
    since: '2026-09-01T16:40:00',
    changes: [{ at: '2026-11-17T06:00:00', from: 'normal', to: 'reduced', by: 'rule', why: 'Rule fired · 305 checks, 0 defects' }],
    checks: 126,
    defects: 0,
    defectDays: [],
    fired: { checks: 305, defects: 0 },
  },
  {
    activityId: 'vaccine-history',
    rules: TEMPLATE_RULES,
    writtenBy: 'priya',
    writtenAt: d('2027-01-04T10:00:00'),
    since: '2026-08-03T10:00:00',
    changes: [{ at: '2026-11-03T06:00:00', from: 'normal', to: 'reduced', by: 'rule', why: 'Rule fired · 301 checks, 0 defects' }],
    checks: 62,
    defects: 0,
    defectDays: [],
    fired: { checks: 301, defects: 0 },
  },
]

/** Checks recorded earlier this week, before today's draw (13b "Checked this week · 31"). */
export const CHECKED_EARLIER_THIS_WEEK = 29

const today = (hhmm: string) => `2026-12-08T${hhmm}:00`
const drawn = today('06:00')

/**
 * Today's draw (13b), verbatim: 6 drawn at 06:00, 2 already checked. ACT-90412's lines are the
 * frame's; the others are invented in the same voice (R9). Builds are the seed's live ones (R1).
 */
export const samplingDraws: SamplingDraw[] = [
  {
    id: 'draw-act-90412', actionCode: 'ACT-90412', activityId: 'allergy-recon', encounter: '7731', unit: '8 East', list: 'allergy list',
    signedBy: 'Lee T., PharmD', signedAt: today('08:14'), drawnAt: drawn, build: 'v1.2.0',
    lines: [
      { output: 'Add: penicillin · hives', outputSub: 'From an outside record', source: 'St. Mary’s summary, 2019', chart: 'Penicillin · hives' },
      { output: 'Keep: latex · rash', outputSub: 'Already on the list', source: 'Lakeshore chart, 2023', chart: 'Latex · rash' },
      { output: 'Add: sulfa · reaction unknown', outputSub: 'From an outside record', source: 'St. Mary’s summary, 2019', chart: 'Sulfonamide antibiotics' },
    ],
  },
  {
    id: 'draw-act-90377', actionCode: 'ACT-90377', activityId: 'allergy-recon', encounter: '7702', unit: '7 West', list: 'allergy list',
    signedBy: 'Ana R., PharmD', signedAt: today('07:41'), drawnAt: drawn, build: 'v1.2.0',
    lines: [
      { output: 'Add: codeine · nausea', outputSub: 'From an outside record', source: 'Riverside clinic note, 2021', chart: 'Codeine · nausea' },
      { output: 'Keep: shellfish · hives', outputSub: 'Already on the list', source: 'Lakeshore chart, 2022', chart: 'Shellfish · hives' },
    ],
  },
  {
    id: 'draw-act-90330', actionCode: 'ACT-90330', activityId: 'allergy-recon', encounter: '7688', unit: '8 East', list: 'allergy list',
    signedBy: 'Jo K., PharmD', signedAt: today('07:02'), drawnAt: drawn, build: 'v1.2.0',
    lines: [{ output: 'Add: amoxicillin · rash', outputSub: 'From an outside record', source: 'St. Mary’s summary, 2020', chart: 'Amoxicillin · rash' }],
    result: 'right', checkedBy: 'marcus', checkedAt: today('08:40'),
  },
  {
    id: 'draw-act-90398', actionCode: 'ACT-90398', activityId: 'duplicate-rx', encounter: '7719', unit: '7 West', list: 'medication list',
    signedBy: 'Ana R., PharmD', signedAt: today('07:55'), drawnAt: drawn, build: 'v1.5.2',
    lines: [{ output: 'Flag: omeprazole twice', outputSub: 'Two pharmacies, same strength', source: 'Outside fills, 30 days', chart: 'Omeprazole 20 mg, once' }],
  },
  {
    id: 'draw-act-90351', actionCode: 'ACT-90351', activityId: 'duplicate-rx', encounter: '7695', unit: '8 East', list: 'medication list',
    signedBy: 'Lee T., PharmD', signedAt: today('07:20'), drawnAt: drawn, build: 'v1.5.2',
    lines: [{ output: 'No duplicates found', outputSub: '12 medications compared', source: 'Home list and fills, 90 days', chart: '12 medications' }],
    result: 'right', checkedBy: 'marcus', checkedAt: today('08:52'),
  },
  {
    id: 'draw-act-90365', actionCode: 'ACT-90365', activityId: 'vaccine-history', encounter: '7698', unit: '7 West', list: 'vaccine record',
    signedBy: 'Jo K., PharmD', signedAt: today('07:33'), drawnAt: drawn, build: 'v2.2.0',
    lines: [
      { output: 'Add: influenza 2026–27 · 14 Oct', outputSub: 'From the state registry', source: 'State immunization registry', chart: 'Influenza 2026–27' },
      { output: 'Keep: Tdap · 2019', outputSub: 'Already on the list', source: 'Lakeshore chart, 2019', chart: 'Tdap' },
    ],
  },
]

/** What 14a and 14b say about PRM-0007 that the state doesn't hold (R11). */
export const PROMOTION_CONTENT: Record<
  string,
  {
    summary: string
    signedAsIs: { target: number; result: number }
    rejected: { target: number; result: number }
    defects: { target: number; base: { defects: number; checks: number } }
    reducedDays: number
    outputs: string
    note: string
    atLevel: [string, string][]
    stepDownOn: string
    triggers: string[]
    staysTheSame: { text: string; tag?: string }[]
    agenda: { item: number; of: number }
  }
> = {
  'prm-0007': {
    summary: 'At Supervised, this branch writes to the chart without a pharmacist signing each add. Adds are checked by sample, and every step-down trigger stays armed.',
    signedAsIs: { target: 98.0, result: 99.1 },
    rejected: { target: 0.5, result: 0.1 },
    // 2 of 412 at baseline: today's checked draw (ACT-90330) is the 412th (R11).
    defects: { target: 0.5, base: { defects: 2, checks: 411 } },
    reducedDays: 14,
    outputs: '4,212 adds',
    note: 'The 2 defects were duplicate allergies spelled differently, in October. SOP v1.2.1 fixed them; none since.',
    atLevel: [
      ['In the chart', 'Adds appear as “added by Allergy Recon Agent, checked by sample”'],
      ['Pharmacists', 'Stop signing each add; still sign updates to reaction or severity'],
      ['Review level', 'Resets to Normal: 1 in 10 adds checked'],
      ['Steps down to Draft on', 'Any defect in a check · a new agent or SOP version · any linked incident'],
    ],
    stepDownOn: 'Any defect in a check · a new agent or SOP version · any linked incident',
    triggers: ['Any new agent or SOP version', 'Any defect in an independent check', 'Any linked incident', 'Rejections above 0.5 % for 3 days'],
    staysTheSame: [
      { text: 'Updating a reaction or severity stays at Draft' },
      { text: 'Removing an allergy is never allowed', tag: 'HS-07 v1' },
      { text: 'Conditions C1 and C3 from the original approval' },
    ],
    agenda: { item: 2, of: 4 },
  },
}

/** Marcus asked to promote one branch of reconcile allergy lists to Supervised on 03 Mar → 25 Nov (14a). */
export const promotions: Promotion[] = [
  {
    id: 'prm-0007',
    activityId: 'allergy-recon',
    branchId: 'outside-records',
    privilegeCode: PRV_0087.code,
    from: 'draft',
    to: 'supervised',
    requestedBy: 'marcus',
    requestedAt: d('2027-03-03T11:00:00'),
    state: 'sponsor',
  },
]

/** 15a is drawn on 18 Mar and shown on 09 Dec (R1, `E15_SHIFT`): the day after Ana's flag about the same split. */
const e15 = (iso: string) => fromMarch(iso, E15_SHIFT)

/**
 * 15a's threshold breach on Med Rec's admission activity: 14 days of edit rate (the last three above
 * the 15 % trigger on PRV-0142), the cause, and the three days before the trigger fired (R1, R12).
 */
export const STEP_DOWN_MED_REC = {
  activityId: 'med-rec-admission',
  trigger: 'Edit rate above 15% for 3 days',
  series: [8.6, 8.9, 8.7, 9.1, 8.8, 8.9, 8.6, 9.0, 8.8, 9.4, 12.9, 16.8, 17.9, 18.4],
  firstDay: e15('2027-03-05T00:00:00'),
  threshold: 15,
  routed: 18,
  units: '7 West and 8 East worklists, within a minute',
  cause: `Pharmacists are splitting frequency fields since the Epic upgrade on ${formatDate(e15('2027-03-14T00:00:00'))}`,
  days: [
    { at: e15('2027-03-16T00:00:00'), value: 16.8, sub: 'Day 1 above 15 %' },
    { at: e15('2027-03-17T00:00:00'), value: 17.9, sub: 'Day 2 · Marcus warned' },
    { at: e15('2027-03-18T00:00:00'), value: 18.4, sub: 'Day 3 · trigger fired' },
  ],
  at: e15('2027-03-18T06:00:00'),
}
