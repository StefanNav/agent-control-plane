import type { Privilege } from '../types'
import { activities } from './activities'
import { agents } from './agents'

/**
 * Baseline privileges as of 08 Dec, one per Medications activity, taken from the division
 * view (level, grantor, review date). Codes from the frames where they exist; the component
 * sheet's lapsed / stepped-down examples live in the gallery fixtures and in scenarios.
 */
const KNOWN: Record<string, Partial<Privilege>> = {
  'med-rec-allergy': { domain: '7 West, 8 East · adults 18+', evidence: 'Shadow validation in progress', grantedAt: '2026-10-14T10:00:00', grantedBy: 'drlee', reviewDate: undefined },
  'discharge-meds-interactions': { domain: '7 West · adults', evidence: 'Shadow validation in progress', grantedBy: 'drlee', grantedAt: '2026-09-02T10:00:00', reviewDate: '2026-12-02T00:00:00' },
  'med-rec-admission': {
    code: 'PRV-0142',
    version: 3,
    domain: '7 West, 8 East · adults 18+',
    evidence: '21-day shadow · 1,204 cases · 2 of 3 targets met',
    conditions: ['C1–C3 · Dr. Lee'],
    grantedAt: '2026-11-06T10:05:00',
    reviewDate: '2027-02-05T00:00:00',
    stepDownTriggers: ['Edit rate above 15% for 3 days', 'New version', 'Incident'],
  },
  'discharge-meds': {
    code: 'PRV-0127',
    version: 2,
    domain: '7 West, 8 East · adults 18+',
    evidence: '28-day shadow · 2,310 cases · 3 of 3 targets met',
    conditions: ['C1 · Dr. Lee'],
    grantedAt: '2026-08-14T10:05:00',
  },
  'duplicate-rx': {
    code: 'PRV-0098',
    version: 4,
    domain: 'Adult inpatient units',
    evidence: '96 days at Draft · 95.3% signed as is',
    state: 'due',
    grantedAt: '2026-07-02T16:40:00',
  },
  'renal-dosing': {
    code: 'PRV-0131',
    version: 3,
    domain: '7 West, 8 East · adults 18+',
    evidence: '28-day shadow · 3 of 3 targets met',
    conditions: ['C1–C2 · Dr. Lee'],
    grantedAt: '2026-08-19T09:12:00',
    stepDownTriggers: ['Edit rate above 15% for 3 days'],
  },
}

let next = 150

export const privileges: Privilege[] = activities
  .filter((act) => agents.find((a) => a.id === act.agentId)?.divisionId === 'medications')
  .map((act) => {
    const agent = agents.find((a) => a.id === act.agentId)!
    const known = KNOWN[act.id] ?? {}
    return {
      id: (known.code ?? `PRV-0${next++}`).toLowerCase(),
      code: known.code ?? `PRV-0${next - 1}`,
      version: known.version ?? 1,
      activityId: act.id,
      agentId: agent.id,
      level: act.level,
      domain: known.domain ?? '7 West, 8 East · adults 18+',
      conditions: known.conditions ?? [],
      evidence: known.evidence ?? 'Shadow validation · targets met',
      grantedBy: known.grantedBy ?? (act.level === 'shadow' ? 'drlee' : agent.grantorId),
      grantedAt: known.grantedAt ?? '2026-09-01T10:00:00',
      reviewDate: 'reviewDate' in known ? known.reviewDate : agent.reviewDate,
      state: known.state ?? 'active',
      stepDownTriggers: known.stepDownTriggers ?? ['Edit rate above 15% for 3 days'],
    }
  })
