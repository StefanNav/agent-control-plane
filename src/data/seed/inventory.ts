import type { Agent, ExportRecord } from '../types'

/** Owner, sponsor and technical owner per division, as in people.ts. */
const PEOPLE: Record<string, [owner: string, sponsor: string, tech: string]> = {
  'revenue-cycle': ['tom', 'nina', 'omar'],
  medications: ['marcus', 'priya', 'sam'],
  discharge: ['elena', 'priya', 'lena'],
  'imaging-referrals': ['ravi', 'hana', 'omar'],
  'patient-messages': ['grace', 'owen', 'omar'],
}

/** Retired agents: archived, off every board, still in audit and exports (Inventory → Retired). */
function retired(id: string, code: string, name: string, divisionId: string, at: string, archive: string, reason: string): Agent {
  const [ownerId, sponsorId, techOwnerId] = PEOPLE[divisionId]!
  return {
    id,
    code,
    name,
    version: 'v1.0.0',
    platform: 'Epic',
    divisionId,
    ownerId,
    techOwnerId,
    sponsorId,
    riskTier: 1,
    lifecycle: 'retired',
    level: 'shadow',
    grantorId: 'drlee',
    reviewDate: at,
    judgment: { status: 'normal', label: 'Retired' },
    metrics: { day: null, signedAsIs: null, edited: null, blocked: null, trend: { end: 80, drift: 0 } },
    monitor: { lastSeen: at, expectedIntervalMin: 5 },
    retirement: { at, by: 'dana', code: archive, reason },
  }
}

export const retiredAgents: Agent[] = [
  retired('fax-intake', 'AGT-0091', 'Fax Intake Agent', 'imaging-referrals', '2026-03-18T10:00:00', 'RET-01', 'Referrals moved to the e-referral portal.'),
  retired('card-ocr', 'AGT-0092', 'Insurance Card OCR Agent', 'revenue-cycle', '2026-05-07T15:30:00', 'RET-02', 'Replaced by eligibility checks at registration.'),
  retired('warfarin-dosing', 'AGT-0093', 'Warfarin Dosing Agent', 'medications', '2026-06-22T09:10:00', 'RET-03', 'Shadow agreement stayed below target after 60 days.'),
  retired('discharge-checklist', 'AGT-0094', 'Discharge Checklist Agent', 'discharge', '2026-08-11T13:45:00', 'RET-04', 'Folded into Discharge Instructions Agent.'),
  retired('visit-reminder', 'AGT-0095', 'Visit Reminder Agent', 'patient-messages', '2026-09-02T11:00:00', 'RET-05', 'Epic sends reminders natively.'),
  retired('lab-explainer', 'AGT-0096', 'Lab Result Explainer Agent', 'patient-messages', '2026-09-18T16:20:00', 'RET-06', 'Committee withdrew the use case.'),
]

/** Earlier exports ("Past exports · 3", 7d). */
export const exportRecords: ExportRecord[] = [
  { id: 'exp-0001', code: 'EXP-0001', agentIds: ['med-rec'], from: '2026-11-06T00:00:00', to: '2026-11-13T00:00:00', format: 'packet', masked: true, by: 'dana', at: '2026-11-13T15:00:00' },
  { id: 'exp-0002', code: 'EXP-0002', agentIds: ['prior-auth'], from: '2026-10-01T00:00:00', to: '2026-11-01T00:00:00', format: 'csv', masked: true, by: 'jordan', at: '2026-11-20T09:40:00' },
  { id: 'exp-0003', code: 'EXP-0003', agentIds: ['med-rec', 'discharge-meds'], from: '2026-11-06T00:00:00', to: '2026-12-01T00:00:00', format: 'packet', masked: true, by: 'dana', at: '2026-12-01T17:10:00' },
]
