import type { Privilege } from '../types'
import { activities } from './activities'
import { agents } from './agents'
import { PRV_0087 } from './autonomy'

/**
 * Baseline privileges as of 08 Dec, one per Medications activity, taken from the division
 * view (level, grantor, review date). Codes from the frames where they exist; the component
 * sheet's lapsed / stepped-down examples live in the gallery fixtures and in scenarios.
 * Conditions are the committee's condition ids; the cards format them ("C1–C3 · Dr. Lee").
 */
const KNOWN: Record<string, Partial<Privilege>> = {
  // Med Rec's two activities: v2 when the committee's conditions applied (14 Oct), v3 when Priya signed Draft (06 Nov).
  'med-rec-admission': {
    code: 'PRV-0142',
    version: 3,
    domain: '7 West, 8 East · adults 18+ · excluding dialysis (C3)',
    evidence: '21-day shadow · 1,118 cases · 2 of 3 targets met',
    conditions: ['C1', 'C2', 'C3'],
    grantedAt: '2026-11-06T09:52:00',
    reviewDate: '2027-02-05T00:00:00',
    stepDownTriggers: ['Edit rate above 15% for 3 days', 'New version', 'Incident'],
    signReason: '21 of the 29 inaccurate lines were brand and generic name mismatches. SOP v1.3.1 fixes the mapping, and a pharmacist signs every draft (C1).',
  },
  'med-rec-allergy': {
    code: 'PRV-0143',
    version: 2,
    domain: '7 West, 8 East · adults 18+ · excluding dialysis (C3)',
    evidence: 'Shadow validation in progress',
    conditions: ['C1', 'C3'],
    grantedBy: 'drlee',
    grantedAt: '2026-10-14T16:20:00',
    reviewDate: undefined,
  },
  'discharge-meds-interactions': { domain: '7 West · adults', evidence: 'Shadow validation in progress', grantedBy: 'drlee', grantedAt: '2026-09-02T10:00:00', reviewDate: '2026-12-02T00:00:00' },
  'discharge-meds': {
    code: 'PRV-0127',
    version: 2,
    domain: '7 West, 8 East · adults 18+',
    evidence: '28-day shadow · 2,310 cases · 3 of 3 targets met',
    conditions: ['C1'],
    grantedAt: '2026-11-14T10:05:00',
  },
  'duplicate-rx': {
    code: 'PRV-0098',
    version: 4,
    domain: 'Adult inpatient units',
    evidence: '96 days at Draft · 95.3% signed as is',
    state: 'due',
    grantedAt: '2026-09-01T16:40:00',
  },
  'renal-dosing': {
    code: 'PRV-0131',
    version: 3,
    domain: '7 West, 8 East · adults 18+',
    evidence: '28-day shadow · 3 of 3 targets met',
    conditions: ['C1', 'C2'],
    grantedAt: '2026-10-30T09:12:00',
    stepDownTriggers: ['Edit rate above 15% for 3 days'],
  },
  // Sign dates from 3d.
  'med-shortage': { grantedAt: '2026-09-23T10:00:00' },
  'controlled-drug': { grantedAt: '2026-10-10T10:00:00' },
  // 13a, 14a, 15b: Allergy Recon is PRV-0087, at v5 since 16 Oct (3d), with C1 and C3 from its approval (14b, R2).
  'allergy-recon': { code: PRV_0087.code, version: PRV_0087.version, conditions: PRV_0087.conditions, grantedAt: '2026-10-16T10:00:00' },
}

/** Codes the frames name; the rest count down from PRV-0141 so Med Rec's PRV-0142 comes next (ruling R11). */
const TAKEN = new Set([98, 127, 131, 142, 143])
let next = 141
const autoCode = () => {
  while (TAKEN.has(next)) next--
  return `PRV-0${next--}`
}

/** Signed 91 days before the review date (a 90-day cycle counted from the day after signing). */
const signedBefore = (review: string) => {
  const d = new Date(review)
  d.setDate(d.getDate() - 91)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00:00`
}

const signed: Privilege[] = activities
  .filter((act) => agents.find((a) => a.id === act.agentId)?.divisionId === 'medications')
  .map((act) => {
    const agent = agents.find((a) => a.id === act.agentId)!
    const known = KNOWN[act.id] ?? {}
    const code = known.code ?? autoCode()
    const reviewDate = 'reviewDate' in known ? known.reviewDate : agent.reviewDate
    return {
      id: code.toLowerCase(),
      code,
      version: known.version ?? 1,
      activityId: act.id,
      agentId: agent.id,
      level: act.level,
      domain: known.domain ?? '7 West, 8 East · adults 18+',
      conditions: known.conditions ?? [],
      evidence: known.evidence ?? 'Shadow validation · targets met',
      grantedBy: known.grantedBy ?? (act.level === 'shadow' ? 'drlee' : agent.grantorId),
      grantedAt: known.grantedAt ?? (reviewDate ? signedBefore(reviewDate) : '2026-09-01T10:00:00'),
      reviewDate,
      state: known.state ?? 'active',
      stepDownTriggers: known.stepDownTriggers ?? ['Edit rate above 15% for 3 days'],
      ...(known.signReason ? { signReason: known.signReason } : {}),
    }
  })

/** PRV-0087 v1, closed: Allergy Recon's first signature at Draft (15b's history, R2). v2–v4 were renewals at the same level. */
const prv0087v1: Privilege = {
  ...signed.find((p) => p.code === PRV_0087.code)!,
  id: 'prv-0087-v1',
  version: 1,
  state: 'closed',
  grantedBy: 'priya',
  grantedAt: PRV_0087.firstSignedAt,
  reviewDate: '2026-12-09T00:00:00',
  conditions: PRV_0087.conditions,
}

export const privileges: Privilege[] = [...signed, prv0087v1]
