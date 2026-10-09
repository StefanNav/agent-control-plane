import { DEMO_NOW, formatDate } from '../../lib/clock'
import type { RuaihElement, RuaihGap } from '../types'
import { E12_SHIFT, fromMarch } from './redate'

/**
 * RUAIH evidence (E12, 12a and 12b): drawn on 24 Mar 2027, shown at 08 Dec (R1, `E12_SHIFT`).
 * What the state already records (flags, step-downs, re-validations, privilege versions) is read
 * from it; everything else here is the hospital's mapping as it stood (Phase 7 R4, R5).
 */
const d = (iso: string) => fromMarch(iso, E12_SHIFT)

/** The seven elements of the Joint Commission and CHAI guidance, in their order (12a's columns). */
export const RUAIH_ELEMENTS: { n: RuaihElement; name: string }[] = [
  { n: 1, name: 'Governance' },
  { n: 2, name: 'Privacy and transparency' },
  { n: 3, name: 'Data security' },
  { n: 4, name: 'Quality monitoring' },
  { n: 5, name: 'Safety event reporting' },
  { n: 6, name: 'Risk and bias' },
  { n: 7, name: 'Education and training' },
]

/** When the mapping behind the frame's numbers was taken: records made since add to them (R4). */
export const RUAIH_MAPPED_AT = DEMO_NOW

/** The survey window 12a counts down to (14 Apr → 29 Dec). */
export const SURVEY_OPENS = d('2027-04-14T00:00:00')

/**
 * 12a's eight rows, in its order. Its "Patient Messages Agent · Patient access" is the seed's
 * Message Triage Agent in Patient messages (R4). Every other agent folds into "N more agents".
 */
export const RUAIH_FEATURED = ['med-rec', 'discharge-meds', 'allergy-recon', 'renal-dosing', 'formulary-swap', 'discharge-summary', 'prior-auth', 'message-triage']

type Counts = [number, number, number, number, number, number, number]

/** Records mapped per element as of `RUAIH_MAPPED_AT`, verbatim from 12a (0 where 12a shows a gap). */
export const RUAIH_BASE: Record<string, Counts> = {
  'med-rec': [6, 0, 4, 22, 7, 3, 2],
  'discharge-meds': [5, 3, 4, 18, 4, 2, 2],
  'allergy-recon': [5, 3, 4, 16, 2, 2, 0],
  'renal-dosing': [4, 2, 4, 12, 3, 0, 2],
  'formulary-swap': [4, 2, 4, 0, 1, 2, 2],
  'discharge-summary': [5, 0, 3, 14, 0, 2, 2],
  'prior-auth': [6, 2, 5, 20, 3, 3, 2],
  'message-triage': [3, 0, 0, 5, 1, 1, 1],
}

/** The agents 12a folds away ("All 7 elements covered") read this. */
export const RUAIH_DEFAULT: Counts = [4, 2, 4, 12, 2, 2, 2]

/** The eight open gaps (12a). The last three are behind "Show 3 more" and invented (R4). */
export const RUAIH_GAPS: RuaihGap[] = [
  { agentId: 'formulary-swap', element: 4, text: `Monitor stale for 3 h on ${formatDate(d('2027-03-22T00:00:00'))}, with no review recorded`, ownerId: 'sam', due: d('2027-03-31T00:00:00') },
  { agentId: 'med-rec', element: 2, text: 'No patient-facing notice that an agent drafts the medication list', short: 'No patient-facing notice yet', ownerId: 'dana', due: d('2027-04-04T00:00:00') },
  { agentId: 'discharge-summary', element: 5, text: 'Pharmacist flags aren’t routed to the blinded safety report yet', ownerId: 'dana', due: d('2027-04-07T00:00:00') },
  { agentId: 'renal-dosing', element: 6, text: 'No subgroup check for patients with eGFR under 30', ownerId: 'marcus', due: d('2027-04-10T00:00:00') },
  { agentId: 'allergy-recon', element: 7, text: '4 of 31 reviewers haven’t done reviewer training', ownerId: 'priya', due: d('2027-04-11T00:00:00') },
  { agentId: 'discharge-summary', element: 2, text: 'Discharge summaries sent to patients don’t say an agent drafted them', ownerId: 'dana', due: d('2027-04-12T00:00:00') },
  { agentId: 'message-triage', element: 2, text: 'No patient-facing notice on agent-drafted replies', ownerId: 'grace', due: d('2027-04-13T00:00:00') },
  { agentId: 'message-triage', element: 3, text: 'Vendor BAA not on file for the messaging platform', ownerId: 'grace', due: d('2027-04-13T00:00:00') },
]

/** Records 12b names that the state doesn't hold, verbatim for Med Rec (R5); others read the default. */
export const RUAIH_CHIPS: Record<string, Partial<Record<RuaihElement, string[]>>> = {
  'med-rec': {
    1: ['JD v3'],
    2: ['Data use: Epic read, worklist draft'],
    3: ['Vendor BAA', 'Gateway log · 30 days', 'No PHI leaves the gateway'],
    6: [`Subgroups: age, language · ${formatDate(d('2027-03-03T00:00:00'))}`],
    7: ['31 of 31 reviewers trained', `Session ${formatDate(d('2027-03-01T00:00:00'))}`],
  },
}

export const RUAIH_DEFAULT_CHIPS: Partial<Record<RuaihElement, string[]>> = {
  2: ['Data use: Epic read'],
  3: ['Vendor BAA', 'Gateway log · 30 days'],
  7: ['Reviewer training'],
}

/** The monthly blinded patient-safety report (12b's "Blinded PSO report · Mar", R1). */
export const PSO_REPORT = 'Blinded PSO report · Nov'

/** Which records count for each element (12a "Mapping rules", composed; Dana owns them). */
export const MAPPING_RULES: { element: RuaihElement; records: string }[] = [
  { element: 1, records: 'Job descriptions, privilege versions and committee decisions' },
  { element: 2, records: 'Data-use statements and patient-facing notices' },
  { element: 3, records: 'Vendor agreements, gateway logs and PHI rules' },
  { element: 4, records: 'Scorecards, step-downs and re-validations' },
  { element: 5, records: 'Pharmacist flags, hard-stop blocks and patient-safety reports' },
  { element: 6, records: 'Risk tiers and subgroup checks' },
  { element: 7, records: 'Reviewer training records' },
]
