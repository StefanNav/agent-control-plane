import type { Branch, ReviewLevelRecord, ReviewRules, SamplingDraw } from '../types'
import { E13_SHIFT, fromMarch } from './redate'

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
