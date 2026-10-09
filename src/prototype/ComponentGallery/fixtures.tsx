/**
 * Component-sheet data, verbatim from designs/Countersign Components.dc.html and
 * CountersignCore.dc.html (including their own dates). The gallery mirrors the sheet;
 * product screens use the seed instead.
 */
import type { AgentRowView, ExceptionGroup, ExceptionView, LadderState, LadderStep, PrivilegeCardView, SystemsVerbsRow, TraceStepView } from '../../components'
import type { Status } from '../../data/types'
import { RuleTag } from '../../design-system'
import { trendPoints } from '../../lib/trend'
import { InlineMono as M } from './InlineMono'

export const CHIPS: Array<{ status: Status; label: string; note: string }> = [
  { status: 'normal', label: 'Within scope', note: 'none · none · plain word, meta grey' },
  { status: 'review', label: 'Review: 3 drafts', note: 'teal · ring, outlined · what is waiting' },
  { status: 'warn', label: 'Edit rate rising', note: 'amber · diamond, outlined · the trend' },
  { status: 'crit', label: 'Wrong-patient draft · paused', note: 'red · triangle, outlined · reason first' },
  { status: 'stale', label: 'No data for 3h', note: 'neutral · dashed ring and box · how long' },
  { status: 'shadow', label: 'Shadow', note: 'muted · half circle · present, not acting' },
  { status: 'paused', label: 'Paused by Marcus', note: 'muted · pause bars · who paused' },
]

const LADDERS: Record<string, LadderState[]> = {
  pcll: ['passed', 'current', 'locked', 'locked'],
  call: ['current', 'available', 'locked', 'locked'],
}

type Ar = [Status, string, string, string, string, string, string, string, string, string, string, string, string, number, number]

/** CountersignCore `AR`, one row per state (the hover / focus variants are live in the table). */
const AR: Ar[] = [
  ['normal', 'Allergy Recon Agent', 'v1.2.0', 'Within scope', 'JD v3', '344', '96.1%', '3.5%', '0', 'pcll', 'Draft', 'Priya', '14 Jan', 96, 0.1],
  ['normal', 'Antibiotic Stop Agent', 'v2.1.0', 'Within scope', 'JD v2', '127', '93.7%', '5.5%', '1', 'pcll', 'Draft', 'Priya', '03 Feb', 93, 0.2],
  ['normal', 'Discharge Meds Agent', 'v2.0.1', 'Within scope', 'JD v4', '286', '94.8%', '4.9%', '0', 'pcll', 'Draft', 'Priya', '12 Feb', 95, 0.2],
  ['normal', 'Drug Interaction Agent', 'v3.0.2', 'Within scope', 'JD v5', '538', '97.0%', '2.6%', '2', 'pcll', 'Draft', 'Priya', '21 Jan', 97, 0],
  ['review', 'Med Rec Agent', 'v1.3.0', 'Review: 3 drafts', 'HS-04 v2', '412', '91.2%', '7.4%', '3', 'pcll', 'Draft', 'Priya', '05 Jan', 91, 0.2],
  ['warn', 'Renal Dosing Agent', 'v1.1.4', 'Edit rate rising', 'MR-12 v1', '198', '78.3%', '19.2%', '0', 'pcll', 'Draft', 'Priya', '19 Nov', 78, -1.8],
  ['crit', 'Med History Agent', 'v1.7.0', 'Wrong-patient draft · paused', 'HS-11 v1', '57', '89.5%', '8.8%', '1', 'pcll', 'Draft', 'Priya', '09 Jan', 90, 0.3],
  ['stale', 'Formulary Swap Agent', 'v1.4.0', 'No data for 3h', 'MON-02 v1', '—', '—', '—', '—', 'pcll', 'Draft', 'Priya', '28 Jan', 92, 0],
  ['paused', 'Controlled Drug Agent', 'v1.1.0', 'Paused by Marcus', '', '0', '—', '—', '0', 'pcll', 'Draft', 'Priya', '08 Jan', 93, 0],
  ['shadow', 'IV-to-Oral Agent', 'v0.8.2', 'Shadow', 'SC-01 v1', '64', '—', '—', '0', 'call', 'Shadow', 'Dr. Lee', '02 Dec', 88, 0.9],
]

export const AGENT_ROWS: AgentRowView[] = AR.map(([status, name, version, label, rule, day, asIs, edited, blocked, ladder, level, grantor, due, end, drift], i) => ({
  id: name.toLowerCase().replace(/[^a-z]+/g, '-'),
  status,
  label,
  ...(rule ? { ruleTag: rule } : {}),
  name,
  version,
  day,
  signedAsIs: asIs,
  edited,
  blocked,
  trend: trendPoints(i, { end, drift }),
  ladder: LADDERS[ladder]!,
  level,
  grantor,
  reviewDate: due,
}))

const EXB = {
  drafts: { status: 'review', type: 'Drafts to review', reason: '3 med lists held by HS-04 v2 need a pharmacist decision', agent: 'Med Rec Agent', ruleTag: 'HS-04 v2', raised: '09:42', action: 'Review 3 drafts →', actionSub: 'opens side by side with the source list', owner: 'Marcus', deadline: '10:30', deadlineSub: 'in 48 min' },
  edit: { status: 'warn', type: 'Edit rate rising', reason: 'Edit rate 19.2% against a 10% target, rising for 3 days', agent: 'Renal Dosing Agent', ruleTag: 'MR-12 v1', raised: '07:15', action: 'Investigate or return to Shadow →', actionSub: '42 edited drafts to sample', owner: 'Marcus', deadline: '12:00', deadlineSub: 'in 2 h 18 min' },
  stop: { status: 'crit', type: 'Hard stop fired', reason: 'Tried to change a dose 3 times today; the gateway blocked each one', agent: 'Med Rec Agent', ruleTag: 'HS-04 v2', raised: '09:38', action: 'Confirm holds or pause agent →', actionSub: 'paged · 3 traces attached', owner: 'Marcus', deadline: '09:53', deadlineSub: 'in 11 min' },
  stale: { status: 'stale', type: 'Monitor stale', reason: 'No data from Formulary Swap Agent for 3 h; expected every 5 min', agent: 'Formulary Swap Agent', ruleTag: 'MON-02 v1', raised: '06:46', action: 'Check the gateway feed →', actionSub: 'agent may still be running', owner: 'Sam', deadline: '11:00', deadlineSub: 'in 1 h 18 min' },
  priv: { status: 'review', type: 'Privilege review due', reason: 'Duplicate therapy privilege on adult inpatient units expires in 6 days', agent: 'Duplicate Rx Agent', ruleTag: 'PRV-0118', raised: '06 Oct', action: 'Re-sign or step down →', actionSub: '96 days of Draft evidence ready', owner: 'Priya', deadline: '12 Oct', deadlineSub: 'in 6 days' },
} satisfies Record<string, Omit<ExceptionView, 'id' | 'state' | 'ownerSub'>>

type Base = (typeof EXB)[keyof typeof EXB]

/** CountersignCore `ex()`: one exception in one lifecycle state. */
function ex(id: string, base: Base, state: ExceptionView['state'], o: { claimed?: string; late?: string; outcome?: string; outcomeSub?: string; closed?: string; override?: Partial<Base> } = {}): ExceptionView {
  const b = { ...base, ...o.override }
  const resolved = state === 'resolved'
  const overdue = state === 'overdue'
  return {
    ...b,
    id,
    status: b.status as Status,
    state,
    ownerSub: state === 'new' ? 'unclaimed' : resolved ? `resolved by ${b.owner}` : `claimed ${o.claimed ?? '09:44'}`,
    deadline: overdue ? `Overdue ${o.late ?? '12 min'}` : resolved ? `Closed ${o.closed}` : b.deadline,
    deadlineSub: overdue ? 'escalated to Priya' : resolved ? '' : b.deadlineSub,
    ...(resolved ? { outcome: o.outcome, outcomeSub: o.outcomeSub } : {}),
  }
}

export const EXCEPTION_TYPES: ExceptionGroup[] = [
  { id: 'types', items: [ex('t1', EXB.drafts, 'new'), ex('t2', EXB.edit, 'new'), ex('t3', EXB.stop, 'new'), ex('t4', EXB.stale, 'new'), ex('t5', EXB.priv, 'new')] },
]

export const EXCEPTION_STATES: ExceptionGroup[] = [
  {
    id: 'states',
    items: [
      ex('s1', EXB.drafts, 'new'),
      ex('s2', EXB.drafts, 'claimed', { claimed: '09:44' }),
      ex('s3', EXB.drafts, 'overdue', { claimed: '09:44', late: '12 min' }),
      ex('s4', EXB.drafts, 'resolved', { outcome: '3 drafts decided', outcomeSub: '2 signed as is, 1 edited · Ana R.', closed: '10:21' }),
    ],
  },
]

export const INBOX: ExceptionGroup[] = [
  { id: 'overdue', label: 'Overdue', count: 1, items: [ex('i1', EXB.edit, 'overdue', { claimed: '07:30', late: '25 min' })] },
  { id: 'soon', label: 'Due soon', count: 3, items: [ex('i2', EXB.stop, 'new'), ex('i3', EXB.drafts, 'claimed'), ex('i4', EXB.stale, 'new')] },
  {
    id: 'done',
    label: 'Resolved today',
    count: 1,
    items: [
      ex('i5', EXB.drafts, 'resolved', {
        override: { reason: '2 med lists held by HS-07 v1 needed a pharmacist decision', agent: 'Discharge Meds Agent', ruleTag: 'HS-07 v1', raised: '07:58' },
        outcome: '2 drafts signed as is',
        outcomeSub: 'Ana R. · allergy kept on list',
        closed: '08:12',
      }),
    ],
  },
]

export const PRIVILEGES: PrivilegeCardView[] = [
  {
    state: 'awaiting',
    statusLabel: 'Awaiting signature',
    code: 'PRV-0142 v3',
    title: 'Reconcile home medications at admission',
    scope: 'Med Rec Agent · 7 West, 8 East · adults 18+',
    ladder: ['current', 'proposed', 'locked', 'locked'],
    ladderCaption: 'Shadow now · Draft proposed',
    rows: [
      { key: 'Granted by', value: <>Awaiting Priya · asked by Marcus <M>03 Oct</M></> },
      { key: 'Evidence', value: '21-day shadow · 1,204 cases · 2 of 3 targets met' },
      { key: 'Conditions', value: <>C1–C3 · Dr. Lee · <M>29 Sep</M></> },
      { key: 'Review', value: <><M>2027-01-05</M> · 91 days after signing</> },
    ],
    footnote: '1 target missed: signing needs a written reason',
    actionLabel: 'Review and sign',
  },
  {
    state: 'active',
    statusLabel: 'Active',
    code: 'PRV-0127 v2',
    title: 'Draft discharge med list',
    scope: 'Discharge Meds Agent · 7 West, 8 East · adults 18+',
    ladder: ['passed', 'current', 'locked', 'locked'],
    ladderCaption: 'Draft since 14 Aug',
    rows: [
      { key: 'Granted by', value: <>Priya · <M>14 Aug 10:05</M> <RuleTag>ORG-SIGN-01</RuleTag></> },
      { key: 'Evidence', value: '28-day shadow · 2,310 cases · 3 of 3 targets met' },
      { key: 'Conditions', value: <>C1 · Dr. Lee · <M>08 Aug</M></> },
      { key: 'Review', value: <><M>2027-02-12</M> · in 129 days</> },
    ],
    footnote: '3 step-down triggers armed',
    actionLabel: 'Open record',
  },
  {
    state: 'due',
    statusLabel: 'Review due in 6 days',
    code: 'PRV-0118 v4',
    title: 'Flag duplicate therapy',
    scope: 'Duplicate Rx Agent · adult inpatient units',
    ladder: ['passed', 'current', 'locked', 'locked'],
    ladderCaption: 'Draft since 02 Jul',
    rows: [
      { key: 'Granted by', value: <>Priya · <M>02 Jul 16:40</M> <RuleTag>ORG-SIGN-01</RuleTag></> },
      { key: 'Evidence', value: '96 days at Draft · 95.3% signed as is' },
      { key: 'Conditions', value: 'None' },
      { key: 'Review', value: <><M tone="warn">2026-10-12</M> · in 6 days</> },
    ],
    footnote: 'Lapses to Shadow if not re-signed',
    actionLabel: 'Start review',
  },
  {
    state: 'lapsed',
    statusLabel: 'Lapsed to Shadow',
    code: 'PRV-0109 v2',
    title: 'Suggest IV-to-oral switch',
    scope: 'IV-to-Oral Agent · 7 West · adults 18+',
    ladder: ['current', 'available', 'locked', 'locked'],
    ladderCaption: 'Shadow since 28 Sep · was Draft',
    rows: [
      { key: 'Granted by', value: <>Priya · <M>30 Jun 11:20</M> · lapsed <M>28 Sep</M></> },
      { key: 'Evidence', value: 'Last reviewed 98 days ago' },
      { key: 'Conditions', value: 'C1 · Dr. Lee' },
      { key: 'Review', value: <><M>2026-09-28</M> · lapsed 8 days ago</> },
    ],
    footnote: <>Moved by <RuleTag>ORG-LAPSE-01</RuleTag></>,
    actionLabel: 'Re-sign',
  },
  {
    state: 'steppedDown',
    statusLabel: 'Stepped down by MR-12 v1',
    code: 'PRV-0131 v3',
    title: 'Adjust antibiotic doses for kidney function',
    scope: 'Renal Dosing Agent · 7 West, 8 East · adults 18+',
    ladder: ['current', 'available', 'locked', 'locked'],
    ladderCaption: 'Shadow since 03 Oct 14:20 · was Draft',
    rows: [
      { key: 'Granted by', value: <>Priya · <M>19 Aug 09:12</M> <RuleTag>ORG-SIGN-01</RuleTag></> },
      { key: 'Trigger', value: 'Edit rate above 15% for 3 days · it reached 19.2%' },
      { key: 'Conditions', value: 'C1–C2 · Dr. Lee' },
      { key: 'Review', value: <><M>2027-01-19</M> · unchanged</> },
    ],
    footnote: "Back to Draft needs Priya's signature again",
    actionLabel: 'Review evidence',
  },
]

export const LADDER_SIGNING: LadderStep[] = [
  { level: 'shadow', state: 'current', caption: 'Current · since 15 Sep', evidence: '21 days · 1,204 cases' },
  { level: 'draft', state: 'proposed', caption: 'Proposed · awaiting Priya', evidence: '2 of 3 targets met' },
  { level: 'supervised', state: 'locked', caption: 'Locked · v2', evidence: 'Favourable branches only' },
  { level: 'autonomous', state: 'locked', caption: 'Locked', evidence: 'Administrative tasks only' },
]

export const LADDER_AGENT: LadderStep[] = [
  { level: 'shadow', state: 'passed', caption: 'Passed · 15 Sep to 05 Oct', evidence: '91.2% agreement' },
  { level: 'draft', state: 'current', caption: 'Current · since 06 Oct', evidence: 'Priya signed PRV-0142 v3' },
  { level: 'supervised', state: 'locked', caption: 'Locked · v2', evidence: 'Favourable branches only' },
  { level: 'autonomous', state: 'locked', caption: 'Locked', evidence: 'Administrative tasks only' },
]

/** 14a's promoted branch and 15a's step-down, for the wide ladder (Phase 7). */
export const LADDER_PROMOTION: LadderStep[] = [
  { level: 'shadow', state: 'passed' },
  { level: 'draft', state: 'current' },
  { level: 'supervised', state: 'proposed' },
  { level: 'autonomous', state: 'locked' },
]

export const LADDER_STEPPED: LadderStep[] = [
  { level: 'shadow', state: 'current' },
  { level: 'draft', state: 'held' },
  { level: 'supervised', state: 'available' },
  { level: 'autonomous', state: 'locked' },
]

export const GRID: SystemsVerbsRow[] = [
  { system: 'Epic', detail: 'Encounter, home med list, allergies', cells: { read: 'granted', draft: 'granted', write: 'none', submit: 'none', sign: 'locked', order: 'locked' } },
  { system: 'Pharmacy worklist', detail: '7 West and 8 East queues', cells: { read: 'granted', draft: 'granted', write: 'changed', submit: 'none', sign: 'locked', order: 'locked' } },
  { system: 'Pyxis', detail: 'Dispense history, 90 days', cells: { read: 'granted', draft: 'none', write: 'none', submit: 'none', sign: 'locked', order: 'locked' } },
  { system: 'Teams', detail: 'Medications owners channel', cells: { read: 'none', draft: 'none', write: 'granted', submit: 'none', sign: 'locked', order: 'locked' } },
]

export const TRACE_STEPS: TraceStepView[] = [
  { at: '09:38:02.114', kind: 'input', title: 'Admission to 7 West · encounter 4417', detail: 'MRN ••4821 · triggered by ADT A01 · assigned pharmacist Ana R.' },
  { at: '09:38:02.870', kind: 'tool', title: 'epic.read_home_meds(enc 4417)', detail: '9 medications · 212 ms' },
  { at: '09:38:03.301', kind: 'tool', title: 'pyxis.read_dispense_history(MRN ••4821, 90 d)', detail: '14 dispense events · 388 ms' },
  { at: '09:38:04.020', kind: 'policyPassed', ruleTag: 'HS-11 v1', title: 'Patient identity matches the encounter' },
  {
    at: '09:38:04.512',
    kind: 'policyBlocked',
    ruleTag: 'HS-04 v2',
    title: 'Never change a dose',
    detail: 'The draft proposed metoprolol tartrate 25 mg → 50 mg twice daily. The gateway kept 25 mg and flagged the line for the pharmacist.',
    meta: 'decided in 0.4 ms · policy v2 · gw-east-2 · exception EXC-5530',
  },
  { at: '09:38:04.530', kind: 'policyPassed', ruleTag: 'HS-07 v1', title: 'No allergy removed' },
  { at: '09:38:05.104', kind: 'output', title: 'Draft med list · 9 lines, 1 flagged', detail: 'Pended to the 7 West pharmacist worklist' },
  { at: '09:44:31.000', kind: 'reviewer', title: 'Edited 1 line, signed', detail: 'Ana R., PharmD · kept metoprolol at 25 mg · 6 min 26 s after output' },
]
