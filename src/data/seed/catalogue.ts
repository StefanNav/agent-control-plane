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

/**
 * Proposed conditions name activities by position ("@1" = the job's first activity) because the job
 * is written after the template; `resolveConditions` turns them into the job's ids. Empty = every activity.
 */
const MED_REC_CONDITIONS: Condition[] = [
  {
    id: 'C1',
    text: 'A pharmacist signs every draft; nothing is released automatically',
    appliesTo: 'Every activity at Draft and above',
    activityIds: [],
    checkedBy: 'Gateway · enforced',
  },
  {
    id: 'C2',
    text: 'Weekly edit-rate report to Priya for the first 4 weeks at Draft',
    appliesTo: 'Reconcile home medications',
    activityIds: ['@1'],
    checkedBy: 'Priya · weekly',
  },
  {
    id: 'C3',
    text: 'Exclude patients on dialysis until Renal Dosing Agent is back within scope',
    appliesTo: 'Both activities',
    activityIds: [],
    checkedBy: 'Gateway · patient filter',
    domainNote: 'excluding dialysis (C3)',
  },
]

/** Turn "@n" activity references into the job's own activity ids. */
export function resolveConditions(conditions: Condition[], activityIds: string[]): Condition[] {
  return conditions.map((c) => ({ ...c, activityIds: c.activityIds.flatMap((id) => (id.startsWith('@') ? (activityIds[Number(id.slice(1)) - 1] ?? []) : [id])) }))
}

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
  },  // R16 (Phase 6): the intake 9b's bot looks like; approved 06 Nov, never onboarded.
  'req-0081': {
    build: { version: 'v0.4.1', platform: 'Microsoft Teams' },
    actingForOptions: ['The 5 South charge nurse', 'The discharging clinician'],
    suggestionsLabel: 'Common for discharge summaries:',
    escalationSuggestions: ['A medication changed at discharge', 'Follow-up not booked', 'Patient goes to another facility'],
    criteria: [
      { id: 'agreement', label: 'Agreement with the discharging clinician’s summary', short: 'agreement', brief: 'Agreement', direction: 'atLeast' },
      { id: 'missed', label: 'Summaries missing a follow-up', short: 'miss', brief: 'Missed follow-ups', direction: 'atMost' },
    ],
    systems: [
      { system: 'Epic', detail: 'Discharge notes, 5 South' },
      { system: 'Microsoft Teams', detail: '5 South team channel' },
    ],
    caseNoun: 'discharges',
    compareLine: 'each summary compared with the clinician’s',
    testSample: 210,
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

/** What a new build brings, before it is deployed (9a). The live side comes from the agent at deploy time. */
export interface ChangeDef {
  agentId: string
  build: string
  builtAt: string
  builtBy: string
  sop: string
  /** When the live build was built and its SOP signed (not in the seed elsewhere). */
  liveBuiltAt: string
  liveSopAt: string
  sopDiff: { section: string; title: string; removed?: string; kept?: string; added: string }[]
  hardStop: { code: string; added: string; heldSub: string; blocked: string }
  systems: { system: string; live: string; liveSub: string; held: string; heldSub: string; check: string; detail: string }
  replay: { cases: number; estimate: string; lines: string[] }
  releaseNote: string
  /** Open flags with this reason are the ones the build fixes. */
  fixesReason: 'frequency'
}

/**
 * Med Rec Agent v1.5.0 (9a, R1, R9, R10): drawn on 24 Mar against v1.4.2; here it is built 14 Dec
 * against the seed's v1.3.0 · SOP v1.3.1. Med Rec already reads Pyxis (1c), so the systems change
 * is a wider Epic read. The replay result is invented.
 */
export const V150: ChangeDef = {
  agentId: 'med-rec',
  build: 'v1.5.0',
  builtAt: '2026-12-14T00:00:00',
  builtBy: 'sam',
  sop: 'v1.5',
  liveBuiltAt: '2026-10-12T00:00:00',
  liveSopAt: '2026-11-05T00:00:00',
  sopDiff: [
    {
      section: '§3.2',
      title: 'Frequency',
      removed: 'Read the frequency from the sig line as written.',
      added: 'Read the frequency from the structured frequency field. Since the Epic upgrade on 05 Dec it can be split across two lines; join them before comparing.',
    },
    {
      section: '§5.1',
      title: 'Sources',
      kept: 'Use outside pharmacy fills and the Epic home medication list.',
      added: 'Also use Pyxis dispense history from the last 30 days.',
    },
  ],
  hardStop: {
    code: 'HS-04',
    added: 'Applies to every Med Rec Agent activity. If a draft changes a dose or a frequency, the gateway keeps the original and flags the line for the pharmacist.',
    heldSub: 'adds frequency',
    blocked: 'would have blocked 0 of the last 2,104 cases',
  },
  systems: {
    system: 'Epic',
    live: 'Epic read',
    liveSub: 'encounter, home med list, allergies',
    held: 'Adds Epic sig read',
    heldSub: 'structured frequency and timing',
    check: 'Sign off Epic sig read',
    detail: 'Encounter, home med list, allergies, structured sig',
  },
  replay: {
    cases: 2104,
    estimate: 'about 40 min',
    lines: ['Replayed 2,104 cases on v1.5.0', 'Agreement 92.6 % (v1.3.0: 91.2 %)', 'Frequency mismatches 0 (v1.3.0: 31)'],
  },
  releaseNote: 'Fixes the frequency split pharmacists have flagged since the Epic upgrade.',
  fixesReason: 'frequency',
}

/** One unit's approvals and the independent check over the last 4 weeks (E11; by unit and shift, never by name). */
export interface UnitStats {
  id: string
  name: string
  divisionId: string
  approved: number
  medianSec: number
  wasMedianSec: number
  editRate: number
  wasEditRate: number
  misses: { found: number; sampled: number }
  missRate: number
  wasMissRate: number
  /** 12 weekly points, oldest first; the last is this week. */
  weekly?: { median: number[]; edit: number[]; missRate: number[] }
  /** Start of the unit's 4-week window (11b's "25 Feb to 24 Mar"). */
  windowFrom: string
  shifts: { name: string; hours: string; approved: number; medianSec: number; editRate: number; misses: { found: number; sampled: number } }[]
  missList: { draft: string; agentId: string; approvedSec: number; shift: 'Day' | 'Evening' | 'Night'; found: string; flagCode?: string }[]
  note?: { lead: string; text: string }
}

const shift = (approved: number, medianSec: number, editRate: number, found: number, sampled: number) =>
  ({ approved, medianSec, editRate, misses: { found, sampled } })
const SHIFTS = (rows: ReturnType<typeof shift>[]) =>
  [
    { name: 'Days', hours: '07:00 to 15:00' },
    { name: 'Evenings', hours: '15:00 to 23:00' },
    { name: 'Nights', hours: '23:00 to 07:00' },
  ].map((s, i) => ({ ...s, ...rows[i]! }))

/**
 * 11a and 11b (R1: 24 Mar → 08 Dec, −106 days). 6 North is verbatim; the other units' shifts, misses
 * and "was" values are invented to give 11a's arrows and reads. Medications only (R17).
 */
export const REVIEWER_STATS: UnitStats[] = [
  {
    id: '6-north',
    name: '6 North',
    divisionId: 'medications',
    approved: 1214,
    medianSec: 9,
    wasMedianSec: 38,
    editRate: 1.3,
    wasEditRate: 5.9,
    misses: { found: 3, sampled: 124 },
    missRate: 2.4,
    wasMissRate: 0.5,
    weekly: {
      median: [42, 41, 40, 39, 38, 37, 30, 21, 15, 12, 10, 9],
      edit: [6.2, 6.0, 6.1, 5.9, 5.9, 5.6, 4.2, 3.0, 2.2, 1.7, 1.5, 1.3],
      missRate: [0.5, 0.4, 0.6, 0.5, 0.5, 0.6, 0.9, 1.4, 1.8, 2.1, 2.2, 2.4],
    },
    windowFrom: '2026-11-11T00:00:00',
    shifts: SHIFTS([shift(512, 22, 2.9, 0, 52), shift(418, 11, 1.1, 1, 42), shift(284, 4, 0.4, 2, 30)]),
    missList: [
      { draft: 'DR-90121', agentId: 'med-rec', approvedSec: 4, shift: 'Night', found: 'Kept a duplicate apixaban line from two pharmacies' },
      { draft: 'DR-89960', agentId: 'discharge-meds', approvedSec: 6, shift: 'Night', found: 'Stopped medication still on the discharge list' },
      { draft: 'DR-89802', agentId: 'med-rec', approvedSec: 9, shift: 'Evening', found: 'Missed eye drops from an outside record', flagCode: 'FB-2286' },
    ],
    note: {
      lead: 'Night coverage changed on 15 Nov.',
      text: 'One pharmacist now covers 6 North, 6 South and ICU step-down. Approvals per night pharmacist rose from 31 to 74.',
    },
  },
  {
    id: '7-west',
    name: '7 West',
    divisionId: 'medications',
    approved: 1842,
    medianSec: 36,
    wasMedianSec: 35,
    editRate: 17.9,
    wasEditRate: 9.4,
    misses: { found: 1, sampled: 180 },
    missRate: 0.6,
    wasMissRate: 0.6,
    windowFrom: '2026-11-11T00:00:00',
    shifts: SHIFTS([shift(780, 38, 18.4, 1, 77), shift(620, 35, 17.6, 0, 60), shift(442, 33, 17.4, 0, 43)]),
    missList: [{ draft: 'DR-90044', agentId: 'renal-dosing', approvedSec: 41, shift: 'Day', found: 'Renal dose kept after the creatinine improved' }],
  },
  {
    id: '8-east',
    name: '8 East',
    divisionId: 'medications',
    approved: 1610,
    medianSec: 41,
    wasMedianSec: 40,
    editRate: 16.2,
    wasEditRate: 8.8,
    misses: { found: 1, sampled: 161 },
    missRate: 0.5,
    wasMissRate: 0.5,
    windowFrom: '2026-11-11T00:00:00',
    shifts: SHIFTS([shift(690, 44, 16.8, 0, 69), shift(540, 40, 15.9, 1, 54), shift(380, 37, 15.6, 0, 38)]),
    missList: [{ draft: 'DR-89915', agentId: 'med-rec', approvedSec: 39, shift: 'Evening', found: 'Inhaler listed twice under brand and generic names' }],
  },
  {
    id: '5-south',
    name: '5 South',
    divisionId: 'medications',
    approved: 702,
    medianSec: 33,
    wasMedianSec: 34,
    editRate: 3.0,
    wasEditRate: 6.1,
    misses: { found: 0, sampled: 70 },
    missRate: 0.4,
    wasMissRate: 0.5,
    windowFrom: '2026-11-11T00:00:00',
    shifts: SHIFTS([shift(300, 35, 3.2, 0, 30), shift(236, 32, 2.9, 0, 24), shift(166, 30, 2.7, 0, 16)]),
    missList: [],
  },
  {
    id: 'ed-observation',
    name: 'ED observation',
    divisionId: 'medications',
    approved: 402,
    medianSec: 52,
    wasMedianSec: 50,
    editRate: 7.4,
    wasEditRate: 7.3,
    misses: { found: 0, sampled: 40 },
    missRate: 0.9,
    wasMissRate: 0.8,
    windowFrom: '2026-11-11T00:00:00',
    shifts: SHIFTS([shift(170, 55, 7.6, 0, 17), shift(136, 51, 7.3, 0, 14), shift(96, 48, 7.1, 0, 9)]),
    missList: [],
  },
]

/** The independent check's rate: a second pharmacist re-checks this share of approved lists (11a). */
export const INDEPENDENT_CHECK_PERCENT = 10
