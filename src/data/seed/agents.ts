import type { Agent, Level, Status } from '../types'

const LIVE = '2026-12-08T09:51:00'

/** '05 Feb' → '2027-02-05'; December dates fall in 2026 (the demo is 08 Dec 2026). */
function reviewDate(dayMonth: string): string {
  const [day, mon] = dayMonth.split(' ') as [string, string]
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon) + 1
  const year = month === 12 ? 2026 : 2027
  return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`
}

const num = (v: string): number | null => (v === '—' ? null : Number(v.replace('%', '')))

/**
 * Medications, verbatim from designs/DivisionView.dc.html `AG`:
 * status, label, rule, name, version, 24h, as is, edited, blocked, level, grantor, review, trend end, drift/day.
 */
type Row = [Status, string, string, string, string, string, string, string, string, 'Draft' | 'Shadow', 'Priya' | 'Dr. Lee', string, number, number]

const MEDICATIONS: Array<[id: string, code: string, row: Row]> = [
  ['med-rec', 'AGT-0123', ['review', 'Review: 3 drafts', 'HS-04 v2', 'Med Rec Agent', 'v1.3.0', '138', '89.6%', '8.9%', '3', 'Draft', 'Priya', '05 Feb', 91, 0.2]],
  ['renal-dosing', 'AGT-0108', ['warn', 'Edit rate rising', 'MR-12 v1', 'Renal Dosing Agent', 'v1.1.4', '198', '78.3%', '19.2%', '0', 'Draft', 'Priya', '28 Jan', 78, -1.8]],
  ['duplicate-rx', 'AGT-0098', ['warn', 'Review overdue', 'PRV-0098', 'Duplicate Rx Agent', 'v1.5.2', '211', '95.3%', '4.2%', '0', 'Draft', 'Priya', '01 Dec', 95, 0.1]],
  ['formulary-swap', 'AGT-0131', ['stale', 'No data for 3h', 'MON-02 v1', 'Formulary Swap Agent', 'v1.4.0', '—', '—', '—', '—', 'Draft', 'Priya', '28 Jan', 92, 0]],
  ['allergy-recon', 'AGT-0104', ['normal', 'Within scope', 'JD v3', 'Allergy Recon Agent', 'v1.2.0', '344', '96.1%', '3.5%', '0', 'Draft', 'Priya', '14 Jan', 96, 0.1]],
  ['antibiotic-stop', 'AGT-0112', ['normal', 'Within scope', 'JD v2', 'Antibiotic Stop Agent', 'v2.1.0', '127', '93.7%', '5.5%', '1', 'Draft', 'Priya', '03 Feb', 93, 0.2]],
  ['discharge-meds', 'AGT-0117', ['normal', 'Within scope', 'JD v4', 'Discharge Meds Agent', 'v2.0.1', '286', '94.8%', '4.9%', '0', 'Draft', 'Priya', '12 Feb', 95, 0.2]],
  ['drug-interaction', 'AGT-0101', ['normal', 'Within scope', 'JD v5', 'Drug Interaction Agent', 'v3.0.2', '538', '97.0%', '2.6%', '2', 'Draft', 'Priya', '21 Jan', 97, 0]],
  ['infusion-rate', 'AGT-0126', ['normal', 'Within scope', 'JD v1', 'Infusion Rate Agent', 'v1.3.1', '96', '98.0%', '2.0%', '0', 'Draft', 'Priya', '17 Feb', 98, 0]],
  ['med-history', 'AGT-0106', ['normal', 'Within scope', 'JD v3', 'Med History Agent', 'v1.7.0', '389', '92.8%', '6.6%', '0', 'Draft', 'Priya', '09 Jan', 93, 0.3]],
  ['med-shortage', 'AGT-0135', ['normal', 'Within scope', 'JD v1', 'Med Shortage Agent', 'v1.0.0', '42', '90.5%', '9.5%', '0', 'Draft', 'Priya', '22 Dec', 90, 0.1]],
  ['pharmacy-note', 'AGT-0137', ['normal', 'Within scope', 'JD v1', 'Pharmacy Note Agent', 'v1.0.0', '131', '92.4%', '7.0%', '0', 'Draft', 'Priya', '19 Feb', 92, 0.2]],
  ['prn-review', 'AGT-0129', ['normal', 'Within scope', 'JD v2', 'PRN Review Agent', 'v1.0.6', '158', '94.3%', '5.1%', '0', 'Draft', 'Priya', '26 Jan', 94, 0]],
  ['tpn-draft', 'AGT-0138', ['normal', 'Within scope', 'JD v1', 'TPN Draft Agent', 'v1.0.2', '18', '94.4%', '5.6%', '0', 'Draft', 'Priya', '11 Feb', 94, 0]],
  ['vaccine-history', 'AGT-0115', ['normal', 'Within scope', 'JD v2', 'Vaccine History Agent', 'v2.2.0', '73', '98.6%', '1.4%', '0', 'Draft', 'Priya', '06 Mar', 98, 0]],
  ['warfarin-check', 'AGT-0127', ['normal', 'Within scope', 'JD v1', 'Warfarin Check Agent', 'v1.0.3', '64', '95.3%', '4.7%', '0', 'Draft', 'Priya', '15 Jan', 95, 0.1]],
  ['controlled-drug', 'AGT-0121', ['paused', 'Paused by Marcus', '', 'Controlled Drug Agent', 'v1.1.0', '0', '—', '—', '0', 'Draft', 'Priya', '08 Jan', 93, 0]],
  ['iv-to-oral', 'AGT-0141', ['shadow', 'Shadow', 'SC-01 v1', 'IV-to-Oral Agent', 'v0.8.2', '64', '—', '—', '0', 'Shadow', 'Dr. Lee', '05 Jan', 88, 0.9]],
  ['pediatric-dose', 'AGT-0143', ['shadow', 'Shadow', 'SC-02 v1', 'Pediatric Dose Agent', 'v0.9.1', '51', '—', '—', '0', 'Shadow', 'Dr. Lee', '09 Dec', 86, 0.5]],
  ['opioid-taper', 'AGT-0144', ['shadow', 'Shadow', 'SC-03 v1', 'Opioid Taper Agent', 'v0.7.4', '22', '—', '—', '0', 'Shadow', 'Dr. Lee', '16 Dec', 82, 0.6]],
]

/** Risk tiers from the inventory (8c) and retire dialog (6f). */
const TIER: Record<string, 1 | 2 | 3> = {
  'med-rec': 3,
  'allergy-recon': 3,
  'renal-dosing': 3,
  'duplicate-rx': 3,
  'formulary-swap': 2,
  'iv-to-oral': 2,
}

/** Values the agent view (4c) and division panel (4b) show beyond the board row. */
const EXTRA: Record<string, Partial<Agent>> = {
  'med-rec': { sop: 'v1.3.1', today: { drafts: 96, expected: 140 }, queue: { inProgress: 12, awaitingReview: 4, perHour: 6 } },
  'discharge-meds': { judgedAt: '2026-12-08T09:41:00' },
}

function medicationsAgent([id, code, row]: (typeof MEDICATIONS)[number]): Agent {
  const [status, label, rule, name, version, day, asIs, edited, blocked, level, grantor, review, end, drift] = row
  const stale = status === 'stale'
  return {
    id,
    code,
    name,
    version,
    platform: 'Epic',
    divisionId: 'medications',
    ownerId: 'marcus',
    techOwnerId: 'sam',
    sponsorId: 'priya',
    riskTier: TIER[id] ?? 1,
    lifecycle: status === 'paused' ? 'paused' : 'live',
    level: level.toLowerCase() as Level,
    grantorId: grantor === 'Priya' ? 'priya' : 'drlee',
    reviewDate: reviewDate(review),
    judgment: rule ? { status, label, ruleTag: rule } : { status, label },
    metrics: {
      day: num(day),
      signedAsIs: num(asIs),
      edited: num(edited),
      blocked: num(blocked),
      trend: { end, drift },
      ...(id === 'med-rec' ? { rejected: 1.5 } : {}),
      ...(id === 'discharge-meds' ? { weekActions: 1964, rejected: 0.3 } : {}),
    },
    monitor: { lastSeen: stale ? '2026-12-08T06:41:00' : LIVE, expectedIntervalMin: 5 },
    gateway: 'gw-east-2',
    judgedAt: '2026-12-08T09:41:00',
    ...(status === 'paused' ? { pausedBy: 'marcus', pausedAt: '2026-12-07T16:10:00' } : {}),
    ...EXTRA[id],
  }
}

/**
 * Agents outside Medications. Only Prior Auth Agent is named in the frames (and Discharge
 * Summary Agent in the PRD); the rest are plausible stand-ins (see BUILD_PLAN decision log).
 */
type Other = [id: string, code: string, name: string, version: string, day: number, asIs: number, edited: number, end: number, drift: number]

function otherAgent(divisionId: string, ownerId: string, sponsorId: string, level: Level, status: Status) {
  return ([id, code, name, version, day, asIs, edited, end, drift]: Other): Agent => ({
    id,
    code,
    name,
    version,
    platform: 'Epic',
    divisionId,
    ownerId,
    techOwnerId: 'omar',
    sponsorId,
    riskTier: 1,
    lifecycle: 'live',
    level,
    grantorId: level === 'shadow' ? 'drlee' : sponsorId,
    reviewDate: '2027-02-20T00:00:00',
    judgment: status === 'shadow' ? { status, label: 'Shadow' } : { status, label: 'Within scope' },
    metrics: {
      day,
      signedAsIs: level === 'shadow' ? null : asIs,
      edited: level === 'shadow' ? null : edited,
      blocked: 0,
      trend: { end, drift },
    },
    monitor: { lastSeen: LIVE, expectedIntervalMin: 5 },
    gateway: 'gw-east-2',
  })
}

const priorAuth: Agent = {
  ...otherAgent('revenue-cycle', 'tom', 'nina', 'draft', 'normal')(['prior-auth', 'AGT-0151', 'Prior Auth Agent', 'v2.3.0', 57, 89.5, 8.8, 90, 0.3]),
  lifecycle: 'paused',
  riskTier: 3,
  judgment: { status: 'crit', label: 'Wrong-patient draft · paused', ruleTag: 'PA-11 v1' },
  pausedBy: 'tom',
  pausedAt: '2026-12-08T08:12:00',
}

export const agents: Agent[] = [
  priorAuth,
  ...([
    ['claim-scrubber', 'AGT-0152', 'Claim Scrubber Agent', 'v1.4.2', 412, 95.1, 4.3, 95, 0.1],
    ['denial-appeal', 'AGT-0153', 'Denial Appeal Agent', 'v1.1.0', 37, 91.9, 7.6, 92, 0.2],
    ['eligibility-check', 'AGT-0154', 'Eligibility Check Agent', 'v2.0.3', 655, 98.2, 1.6, 98, 0],
    ['coding-assist', 'AGT-0155', 'Coding Assist Agent', 'v1.2.1', 203, 93.4, 6.0, 93, 0.1],
    ['charge-capture', 'AGT-0156', 'Charge Capture Agent', 'v1.0.4', 128, 96.0, 3.7, 96, 0],
  ] satisfies Other[]).map(otherAgent('revenue-cycle', 'tom', 'nina', 'draft', 'normal')),
  ...MEDICATIONS.map(medicationsAgent),
  ...([
    ['discharge-summary', 'AGT-0161', 'Discharge Summary Agent', 'v2.1.0', 174, 92.6, 6.9, 93, 0.2],
    ['follow-up-booking', 'AGT-0162', 'Follow-up Booking Agent', 'v1.3.0', 96, 97.1, 2.5, 97, 0],
    ['discharge-instructions', 'AGT-0163', 'Discharge Instructions Agent', 'v1.1.2', 141, 94.0, 5.4, 94, 0.1],
    ['home-health-referral', 'AGT-0164', 'Home Health Referral Agent', 'v1.0.6', 33, 93.9, 6.1, 94, 0],
    ['transport-request', 'AGT-0165', 'Transport Request Agent', 'v1.2.0', 58, 98.3, 1.7, 98, 0],
    ['readmission-risk', 'AGT-0166', 'Readmission Risk Agent', 'v2.0.0', 162, 95.7, 3.8, 96, 0.1],
    ['med-teaching', 'AGT-0167', 'Med Teaching Agent', 'v1.0.2', 47, 91.5, 8.1, 92, 0.2],
    ['after-visit-summary', 'AGT-0168', 'After-Visit Summary Agent', 'v1.4.1', 219, 94.9, 4.6, 95, 0.1],
  ] satisfies Other[]).map(otherAgent('discharge', 'elena', 'priya', 'draft', 'normal')),
  ...([
    ['referral-triage', 'AGT-0171', 'Referral Triage Agent', 'v1.2.0', 88, 95.5, 4.1, 95, 0.1],
    ['prior-imaging', 'AGT-0172', 'Prior Imaging Lookup Agent', 'v1.0.3', 124, 98.4, 1.5, 98, 0],
    ['protocol-suggest', 'AGT-0173', 'Protocol Suggest Agent', 'v1.1.1', 61, 93.0, 6.5, 93, 0.2],
    ['contrast-screen', 'AGT-0174', 'Contrast Screen Agent', 'v1.0.5', 49, 96.9, 2.9, 97, 0],
  ] satisfies Other[]).map(otherAgent('imaging-referrals', 'ravi', 'hana', 'draft', 'normal')),
  ...([
    ['message-triage', 'AGT-0181', 'Message Triage Agent', 'v0.6.0', 302, 0, 0, 87, 0.6],
    ['refill-request', 'AGT-0182', 'Refill Request Agent', 'v0.5.2', 118, 0, 0, 85, 0.4],
    ['appointment-reply', 'AGT-0183', 'Appointment Reply Agent', 'v0.4.1', 76, 0, 0, 84, 0.5],
  ] satisfies Other[]).map(otherAgent('patient-messages', 'grace', 'owen', 'shadow', 'shadow')),
]
