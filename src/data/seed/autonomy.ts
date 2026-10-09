import type { Branch, ReviewLevelRecord, ReviewRules } from '../types'
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
