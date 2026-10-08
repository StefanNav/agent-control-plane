import type { Condition, LimitTest, Tier, Verb } from '../types'

/**
 * Static reference data for onboarding: job templates per intake, the gateway tool catalogue,
 * the hard-stop library and the tier rules. Nothing here changes at runtime; everything a
 * person can change lives in DemoState.
 */

/** The policy that locks Sign and Order for every agent (1b, 1c). */
export const ORG_POL_02 = 'ORG-POL-02'

/** The never-list line every agent carries, already enforced by ORG-POL-02 (1b). */
export const ORG_NEVER = 'Sign, release or order anything'

/** What the request expects a job description to cover; Marcus fills it in (1b, 1c). */
export interface JobTemplate {
  /** The build being onboarded. */
  build: { version: string; sop?: string; platform: string }
  actingForOptions: string[]
  /** "Today that’s Ana R. and 4 other pharmacists on 7 West and 8 East." */
  actingForNote?: string
  /** "Common for med rec:" */
  suggestionsLabel: string
  escalationSuggestions: string[]
  criteria: { id: string; label: string; short: string; brief: string; direction: 'atLeast' | 'atMost' }[]
  /** How the scorecard names a shadow case and what it was compared with (3a). */
  caseNoun: string
  compareLine: string
  systems: { system: string; detail: string }[]
  /** Drafts in the last 30 days that hard stops are tested on (1d "of 1,204"). */
  testSample: number
  /** Activities the request expects, for the span of control before the job exists (2a). */
  expectedActivities: number
  /** Conditions AIMS Review proposes to the board (2c). */
  conditions: Condition[]
}

const MED_REC_CONDITIONS: Condition[] = [
  {
    id: 'C1',
    text: 'A pharmacist signs every draft; nothing is released automatically',
    appliesTo: 'Every activity at Draft and above',
    activityIds: ['med-rec-admission', 'med-rec-allergy'],
    checkedBy: 'Gateway · enforced',
  },
  {
    id: 'C2',
    text: 'Weekly edit-rate report to Priya for the first 4 weeks at Draft',
    appliesTo: 'Reconcile home medications',
    activityIds: ['med-rec-admission'],
    checkedBy: 'Priya · weekly',
  },
  {
    id: 'C3',
    text: 'Exclude patients on dialysis until Renal Dosing Agent is back within scope',
    appliesTo: 'Both activities',
    activityIds: ['med-rec-admission', 'med-rec-allergy'],
    checkedBy: 'Gateway · patient filter',
    domainNote: 'excluding dialysis (C3)',
  },
]

/** The standing condition for any agent that drafts for a clinician; no activity ids = every activity. */
const PHARMACIST_SIGNS: Condition = {
  id: 'C1',
  text: 'A pharmacist signs every draft; nothing is released automatically',
  appliesTo: 'Every activity at Draft and above',
  activityIds: [],
  checkedBy: 'Gateway · enforced',
}

const MEDICATIONS_SYSTEMS = {
  epic: { system: 'Epic', detail: 'Encounter, home med list, allergies' },
  worklist: { system: 'Pharmacy worklist', detail: '7 West and 8 East queues' },
  pyxis: { system: 'Pyxis', detail: 'Dispense history' },
  teams: { system: 'Microsoft Teams', detail: 'Messages to the admitting pharmacist' },
}

/** Job templates by intake id. Med Rec's is verbatim from 1b and 1c; the others are invented. */
export const JOB_TEMPLATES: Record<string, JobTemplate> = {
  'req-0093': {
    build: { version: 'v1.3.0', sop: 'v1.3', platform: 'Epic' },
    actingForOptions: ['The admitting pharmacist on the patient’s unit', 'The pharmacy operations lead'],
    actingForNote: 'Today that’s Ana R. and 4 other pharmacists on 7 West and 8 East.',
    suggestionsLabel: 'Common for med rec:',
    escalationSuggestions: [
      'Home list and fill history disagree',
      'Patient on dialysis',
      'More than 15 home medications',
      'Medication not on formulary',
    ],
    criteria: [
      { id: 'agreement', label: 'Agreement with the pharmacist’s list', short: 'agreement', brief: 'Agreement', direction: 'atLeast' },
      { id: 'omitted', label: 'Omitted home medications', short: 'omission', brief: 'Omissions', direction: 'atMost' },
      { id: 'inaccurate', label: 'Inaccurate lines', short: 'inaccuracy', brief: 'Inaccurate lines', direction: 'atMost' },
    ],
    caseNoun: 'admissions',
    compareLine: 'each draft compared with the admitting pharmacist’s final list',
    systems: [MEDICATIONS_SYSTEMS.epic, MEDICATIONS_SYSTEMS.worklist, MEDICATIONS_SYSTEMS.pyxis, MEDICATIONS_SYSTEMS.teams],
    testSample: 1204,
    expectedActivities: 2,
    conditions: MED_REC_CONDITIONS,
  },
  'req-0099': {
    build: { version: 'v0.4.0', platform: 'Epic' },
    actingForOptions: ['The discharging pharmacist on the patient’s unit', 'The antimicrobial stewardship pharmacist'],
    actingForNote: 'Today that’s 6 pharmacists on 7 West and 8 East.',
    suggestionsLabel: 'Common for culture follow-up:',
    escalationSuggestions: [
      'Culture is from a sterile site',
      'Patient readmitted since discharge',
      'Organism resistant to the discharge antibiotic',
    ],
    criteria: [
      { id: 'agreement', label: 'Agreement with the pharmacist’s follow-up', short: 'agreement', brief: 'Agreement', direction: 'atLeast' },
      { id: 'missed', label: 'Missed positive cultures', short: 'missed-culture', brief: 'Missed cultures', direction: 'atMost' },
    ],
    systems: [
      { system: 'Epic', detail: 'Encounter, culture results, discharge medications' },
      { system: 'Pharmacy worklist', detail: 'Discharge follow-up queue' },
      { system: 'Microsoft Teams', detail: 'Messages to the discharging pharmacist' },
    ],
    caseNoun: 'cultures',
    compareLine: 'each draft compared with the pharmacist’s follow-up',
    testSample: 860,
    expectedActivities: 1,
    conditions: [PHARMACIST_SIGNS],
  },
  'req-0106': {
    build: { version: 'v0.2.1', platform: 'Epic' },
    actingForOptions: ['The infusion pharmacist on duty', 'The charge nurse on the unit'],
    suggestionsLabel: 'Common for infusion checks:',
    escalationSuggestions: ['Rate outside the drug library limits', 'Pump not in the drug library', 'High-alert medication'],
    criteria: [
      { id: 'agreement', label: 'Agreement with the pharmacist’s check', short: 'agreement', brief: 'Agreement', direction: 'atLeast' },
      { id: 'missed', label: 'Missed programming errors', short: 'missed-error', brief: 'Missed errors', direction: 'atMost' },
    ],
    systems: [
      { system: 'Epic', detail: 'Infusion orders, weight, allergies' },
      { system: 'Pump gateway', detail: 'Programmed rates, read only' },
      { system: 'Microsoft Teams', detail: 'Messages to the infusion pharmacist' },
    ],
    caseNoun: 'infusions',
    compareLine: 'each check compared with the pharmacist’s',
    testSample: 2310,
    expectedActivities: 1,
    conditions: [PHARMACIST_SIGNS],
  },
  'req-0108': {
    build: { version: 'v0.3.0', platform: 'Epic' },
    actingForOptions: ['The imaging scheduler for the ordering clinic', 'The radiology prior-auth coordinator'],
    suggestionsLabel: 'Common for prior auth:',
    escalationSuggestions: ['Payer needs a peer-to-peer review', 'Order changed after submission', 'Contrast allergy on file'],
    criteria: [
      { id: 'agreement', label: 'Agreement with the coordinator’s packet', short: 'agreement', brief: 'Agreement', direction: 'atLeast' },
      { id: 'returned', label: 'Packets returned by the payer', short: 'return', brief: 'Returned packets', direction: 'atMost' },
    ],
    systems: [
      { system: 'Epic', detail: 'Imaging orders, history, coverage' },
      { system: 'Payer portal', detail: 'Prior-auth submissions' },
      { system: 'Microsoft Teams', detail: 'Messages to the prior-auth coordinator' },
    ],
    caseNoun: 'orders',
    compareLine: 'each packet compared with the coordinator’s',
    testSample: 640,
    expectedActivities: 1,
    conditions: [],
  },
}

/** The gateway catalogue: one tool per grant that needs its own (1d). Worklist read rides on write. */
export const GATEWAY_TOOLS: Record<string, string> = {
  'Epic·read': 'epic.medlist.read',
  'Epic·draft': 'epic.medrec.draft',
  'Epic·write': 'epic.note.write',
  'Pharmacy worklist·write': 'worklist.item.add',
  'Pyxis·read': 'pyxis.dispense.read',
  'Microsoft Teams·write': 'teams.message.send',
  'Pump gateway·read': 'pump.rate.read',
  'Payer portal·draft': 'payer.auth.draft',
  'Payer portal·submit': 'payer.auth.submit',
}

/** The tool for a system and verb, from the catalogue or by convention. */
export function gatewayTool(system: string, verb: Verb): string {
  return GATEWAY_TOOLS[`${system}·${verb}`] ?? `${system.toLowerCase().replace(/[^a-z]+/g, '.')}.${verb}`
}

/** A library rule Sam can attach to a never-list item (1d). */
export interface LibraryRule {
  rule: string
  code: string
  title: string
  text: string
  /** The never-list wording it implements. */
  matches: string
  /** Results recorded for an agent's last 30 days, by agent id. */
  results: Record<string, Pick<LimitTest, 'blocked' | 'examples'>>
}

export const HARD_STOP_LIBRARY: LibraryRule[] = [
  {
    rule: 'DOSE-CHANGE-01',
    code: 'HS-04',
    title: 'Never change a dose',
    text: 'If a draft changes a dose, the gateway keeps the home dose and flags the line for the pharmacist.',
    matches: 'Change a dose',
    results: {
      'med-rec': {
        blocked: 7,
        examples: [
          { date: '2026-09-28T00:00:00', unit: '7 West', text: 'Metoprolol tartrate 25 mg → 50 mg twice daily', trace: 'TR-4471' },
          { date: '2026-09-22T00:00:00', unit: '8 East', text: 'Lisinopril 10 mg → 20 mg daily', trace: 'TR-4219' },
          { date: '2026-09-15T00:00:00', unit: '7 West', text: 'Insulin glargine 18 → 20 units at night', trace: 'TR-3982' },
        ],
      },
    },
  },
  {
    rule: 'ALLERGY-KEEP-02',
    code: 'HS-07',
    title: 'Never remove an allergy',
    text: 'If a draft drops an allergy from the list, the gateway keeps it and flags the line for the pharmacist.',
    matches: 'Remove an allergy',
    results: {
      'med-rec': {
        blocked: 2,
        examples: [
          { date: '2026-09-26T00:00:00', unit: '8 East', text: 'Penicillin allergy left off the draft list', trace: 'TR-4402' },
          { date: '2026-09-11T00:00:00', unit: '7 West', text: 'Sulfonamide allergy left off the draft list', trace: 'TR-3874' },
        ],
      },
    },
  },
  {
    rule: 'PT-MATCH-01',
    code: 'HS-11',
    title: 'Never draft for anyone but the encounter’s patient',
    text: 'The gateway checks the patient on every draft against the encounter before and after drafting.',
    matches: 'Draft for anyone but the encounter’s patient',
    results: { 'med-rec': { blocked: 0, examples: [] } },
  },
]

/** Named case sets for a re-test (1g); the default test is the last 30 days. */
export const RETEST_CASES = {
  ranges: ['01–30 Sep · 8 East', 'Last 30 days · all units'],
  only: ['Transfers in, 212 encounters', 'All encounters'],
  /** Case set id by range and filter, with its size and how a sentence names it. */
  sets: {
    'sep-8east-transfers': { range: '01–30 Sep · 8 East', only: 'Transfers in, 212 encounters', of: 212, phrase: 'September’s 8 East transfers', label: '212 transfers to 8 East' },
    'sep-8east-all': { range: '01–30 Sep · 8 East', only: 'All encounters', of: 588, phrase: 'September’s 8 East admissions', label: '588 admissions to 8 East' },
    'last30-transfers': { range: 'Last 30 days · all units', only: 'Transfers in, 212 encounters', of: 431, phrase: 'the last 30 days of transfers', label: '431 transfers' },
  } as Record<string, { range: string; only: string; of: number; phrase: string; label: string }>,
}

/** What each tier sets (2b), plus Tier 1 and Tier 4 (invented, ruling R6). */
export const TIER_RULES: Record<Tier, { label: string; sub: string; shadowDays: number; board: 'None' | 'Chair' | 'Full board'; reviewDays: number; promotion: 'Sponsor' | 'Board' }> = {
  1: { label: 'Low', sub: 'Admin, no patient data', shadowDays: 7, board: 'None', reviewDays: 365, promotion: 'Sponsor' },
  2: { label: 'Moderate', sub: 'A clinician reviews every output', shadowDays: 14, board: 'Chair', reviewDays: 180, promotion: 'Sponsor' },
  3: { label: 'High', sub: 'Errors can reach patient care', shadowDays: 21, board: 'Full board', reviewDays: 90, promotion: 'Board' },
  4: { label: 'Critical', sub: 'Acts without review', shadowDays: 28, board: 'Full board', reviewDays: 30, promotion: 'Board' },
}

/** Units a rollout domain can add (1b "+ Add unit"). */
export const UNITS = ['5 South', '6 North', '7 West', '8 East', 'ICU', 'Outpatient imaging']

/** AI review board meetings: the second Wednesday of the month at 15:00. */
export const BOARD_MEETINGS = ['2026-10-14T15:00:00', '2026-11-11T15:00:00', '2026-12-09T15:00:00', '2027-01-13T15:00:00']
