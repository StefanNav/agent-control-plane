import type { Agent, IntakeRequest, Onboarding } from '../types'
import { JOB_TEMPLATES, resolveConditions } from './catalogue'

/** Approved intakes. Approval reserves the agent's id and code; REQ-0093 and REQ-0099 have started. */
export const intakeRequests: IntakeRequest[] = [
  {
    id: 'req-0093',
    code: 'REQ-0093',
    title: 'Admission medication reconciliation',
    divisionId: 'medications',
    requestedBy: 'priya',
    approvedAt: '2026-09-29T11:00:00',
    agentId: 'med-rec',
    agentCode: 'AGT-0123',
    agentName: 'Med Rec Agent',
    sponsorId: 'priya',
    purpose: 'Prepare admission medication reconciliation drafts for pharmacist review, so pharmacists start from a complete home medication list.',
    domain: { units: ['7 West', '8 East'], patients: 'Adults 18+', hours: 'All hours' },
    condition: { text: '21-day shadow before any Draft privilege', at: '2026-09-29T11:00:00' },
    patientImpact: 'A wrong or missing home medication carries into inpatient orders',
    volume: 'About 140 admissions a day on 2 units',
    startedAt: '2026-10-01T09:12:00',
  },
  {
    id: 'req-0099',
    code: 'REQ-0099',
    title: 'Positive culture follow-up after discharge',
    divisionId: 'medications',
    requestedBy: 'priya',
    approvedAt: '2026-11-26T14:00:00',
    agentId: 'culture-followup',
    agentCode: 'AGT-0184',
    agentName: 'Culture Follow-up Agent',
    sponsorId: 'priya',
    purpose: 'Find positive cultures that come back after discharge and draft a follow-up for the pharmacist, so no result waits unseen.',
    domain: { units: ['7 West', '8 East'], patients: 'Adults 18+', hours: 'Weekdays' },
    patientImpact: 'A missed positive culture can leave an infection untreated after discharge',
    volume: 'About 25 positive cultures a week on 2 units',
    startedAt: '2026-11-30T10:00:00',
  },
  {
    id: 'req-0106',
    code: 'REQ-0106',
    title: 'Infusion pump programming check',
    divisionId: 'medications',
    requestedBy: 'marcus',
    approvedAt: '2026-12-01T10:30:00',
    agentId: 'infusion-pump-check',
    agentCode: 'AGT-0185',
    agentName: 'Infusion Pump Check Agent',
    sponsorId: 'priya',
    purpose: 'Check each programmed infusion against the order and the drug library, and flag a mismatch to the infusion pharmacist before the next bag.',
    domain: { units: ['6 North', 'ICU'], patients: 'Adults 18+', hours: 'All hours' },
    patientImpact: 'A wrong rate reaches the patient within minutes',
    volume: 'About 300 infusions a day on 2 units',
  },
  {
    id: 'req-0108',
    code: 'REQ-0108',
    title: 'Radiology prior-auth packet',
    divisionId: 'imaging-referrals',
    requestedBy: 'ravi',
    approvedAt: '2026-12-03T14:05:00',
    agentId: 'radiology-prior-auth',
    agentCode: 'AGT-0186',
    agentName: 'Radiology Prior Auth Agent',
    sponsorId: 'hana',
    purpose: 'Assemble the prior-authorization packet for advanced imaging orders, so coordinators submit complete requests the first time.',
    domain: { units: ['Outpatient imaging'], patients: 'All ages', hours: 'Weekdays' },
    patientImpact: 'A delayed authorization delays a scan, not a treatment',
    volume: 'About 60 imaging orders a day',
  },
]

/** The draft agent that starting onboarding creates from an intake (1a): it can't act yet. */
export function agentFromIntake(intake: IntakeRequest, people: { ownerId: string; techOwnerId: string }, at: string): Agent {
  const build = JOB_TEMPLATES[intake.id]?.build ?? { version: 'v0.1.0', platform: 'Epic' }
  return {
    id: intake.agentId,
    code: intake.agentCode,
    name: intake.agentName,
    version: build.version,
    ...(build.sop ? { sop: build.sop } : {}),
    platform: build.platform,
    divisionId: intake.divisionId,
    ownerId: people.ownerId,
    techOwnerId: people.techOwnerId,
    sponsorId: intake.sponsorId,
    riskTier: 1,
    lifecycle: 'onboarding',
    level: 'shadow',
    grantorId: 'drlee',
    reviewDate: '',
    judgment: { status: 'shadow', label: 'Onboarding' },
    metrics: { day: null, signedAsIs: null, edited: null, blocked: null, trend: { end: 0, drift: 0 } },
    monitor: { lastSeen: at, expectedIntervalMin: 5 },
    gateway: 'gw-east-2',
  }
}

/** Med Rec's proposed conditions, bound to its two activities. */
const MED_REC_CONDITIONS = resolveConditions(JOB_TEMPLATES['req-0093']!.conditions, ['med-rec-admission', 'med-rec-allergy'])

const HS11_NOTE = 'HS-11 shows 0 blocks. Before I sign, please test it on September’s 8 East transfers. That’s where a wrong-patient draft would happen.'

/** Med Rec Agent's onboarding and AIMS Review, as E1 and E2 tell it: complete, frozen at v1.0, approved 14 Oct. */
const medRecRecord: Onboarding = {
  agentId: 'med-rec',
  intakeId: 'req-0093',
  startedAt: '2026-10-01T09:12:00',
  startedBy: 'dana',
  version: 10,
  savedAt: '2026-10-07T16:02:00',
  frozenAt: '2026-10-07T16:02:00',
  job: {
    purpose: 'Prepare admission medication reconciliation drafts for pharmacist review, so pharmacists start from a complete home medication list.',
    activities: [
      { id: 'med-rec-admission', name: 'Reconcile home medications at admission', branch: 'Adverse branch: stopping a home medication', short: 'admission med rec' },
      { id: 'med-rec-allergy', name: 'Flag allergy conflicts', branch: 'No adverse branch: flags only', short: 'allergy flags' },
    ],
    never: ['Change a dose', 'Remove an allergy', 'Draft for anyone but the encounter’s patient'],
    actingFor: 'The admitting pharmacist on the patient’s unit',
    escalation: ['Home list and fill history disagree', 'Patient on dialysis', 'More than 15 home medications'],
    targets: { agreement: 90, omitted: 3, inaccurate: 2 },
    domain: { units: ['7 West', '8 East'], patients: 'Adults 18+', hours: 'All hours' },
  },
  grants: [
    { system: 'Epic', verb: 'read', activity: 'all', why: 'Both activities: home list, allergies, fill history', added: '2026-10-05T11:08:00' },
    { system: 'Epic', verb: 'draft', activity: 'med-rec-admission', why: 'Reconcile home medications. The draft lands in Epic as pending, for the pharmacist to sign.', added: '2026-10-05T11:08:00' },
    { system: 'Pharmacy worklist', verb: 'read', activity: null, why: '', added: '2026-10-05T11:08:00' },
    { system: 'Pharmacy worklist', verb: 'write', activity: 'med-rec-admission', why: 'Puts the draft in the admitting pharmacist’s queue', added: '2026-10-05T11:08:00' },
    { system: 'Pyxis', verb: 'read', activity: 'med-rec-admission', why: 'Dispense history, to check the home list', added: '2026-10-05T11:08:00' },
    { system: 'Microsoft Teams', verb: 'write', activity: 'escalation', why: 'Escalation: tell the pharmacist why the case was handed over', added: '2026-10-05T11:08:00' },
  ],
  limits: [
    {
      code: 'HS-04',
      version: 1,
      title: 'Never change a dose',
      text: 'If a draft changes a dose, the gateway keeps the home dose and flags the line for the pharmacist.',
      from: 'Change a dose',
      library: 'DOSE-CHANGE-01',
      ownerId: 'sam',
      test: {
        at: '2026-10-06T14:20:00',
        by: 'sam',
        blocked: 7,
        of: 1204,
        examples: [
          { date: '2026-09-28T00:00:00', unit: '7 West', text: 'Metoprolol tartrate 25 mg → 50 mg twice daily', trace: 'TR-4471' },
          { date: '2026-09-22T00:00:00', unit: '8 East', text: 'Lisinopril 10 mg → 20 mg daily', trace: 'TR-4219' },
          { date: '2026-09-15T00:00:00', unit: '7 West', text: 'Insulin glargine 18 → 20 units at night', trace: 'TR-3982' },
        ],
      },
    },
    {
      code: 'HS-07',
      version: 1,
      title: 'Never remove an allergy',
      text: 'If a draft drops an allergy from the list, the gateway keeps it and flags the line for the pharmacist.',
      from: 'Remove an allergy',
      library: 'ALLERGY-KEEP-02',
      ownerId: 'sam',
      test: {
        at: '2026-10-06T14:20:00',
        by: 'sam',
        blocked: 2,
        of: 1204,
        examples: [
          { date: '2026-09-26T00:00:00', unit: '8 East', text: 'Penicillin allergy left off the draft list', trace: 'TR-4402' },
          { date: '2026-09-11T00:00:00', unit: '7 West', text: 'Sulfonamide allergy left off the draft list', trace: 'TR-3874' },
        ],
      },
    },
    {
      code: 'HS-11',
      version: 1,
      title: 'Never draft for anyone but the encounter’s patient',
      text: 'The gateway checks the patient on every draft against the encounter before and after drafting.',
      from: 'Draft for anyone but the encounter’s patient',
      library: 'PT-MATCH-01',
      ownerId: 'sam',
      test: { at: '2026-10-07T10:40:00', by: 'sam', blocked: 0, of: 212, casesId: 'sep-8east-transfers', examples: [] },
      previousTest: { at: '2026-10-06T14:21:00', by: 'sam', blocked: 0, of: 1204, examples: [] },
    },
  ],
  sponsor: {
    state: 'signed',
    round: 2,
    sentAt: '2026-10-07T10:45:00',
    sentBy: 'sam',
    signedAt: '2026-10-07T16:02:00',
    earlier: [{ at: '2026-10-07T09:14:00', kind: 'returned', to: 'sam', about: 'HS-11', note: HS11_NOTE, casesId: 'sep-8east-transfers' }],
  },
  review: {
    suggestedTier: 2,
    tier: 3,
    tierReason: 'Med rec errors carry into every inpatient order. Pharmacist review catches most, not all. The board should see this at Tier 3 until shadow evidence is in.',
    tierAt: '2026-10-13T10:20:00',
    tierBy: 'dana',
    packetAt: '2026-10-13T10:20:00',
    meeting: '2026-10-14T15:00:00',
    agendaItem: { item: 3, of: 5 },
    proposedConditions: MED_REC_CONDITIONS,
    decision: {
      kind: 'approveWithConditions',
      conditions: MED_REC_CONDITIONS,
      reason: 'Clear limits and good hard-stop evidence. The conditions keep a pharmacist on every draft and keep dialysis patients out while renal dosing is unsettled.',
      by: 'drlee',
      at: '2026-10-14T16:20:00',
      present: '5 of 7 board members present',
    },
    shadowFrom: '2026-10-15T00:00:00',
    shadowDays: 21,
  },
  done: {
    intake: { at: '2026-10-01T09:12:00', by: 'dana' },
    job: { at: '2026-10-04T09:05:00', by: 'marcus' },
    systems: { at: '2026-10-05T11:12:00', by: 'marcus' },
    tools: { at: '2026-10-07T10:45:00', by: 'sam' },
  },
  history: [
    { at: '2026-10-01T09:12:00', by: 'dana', text: 'Dana · started onboarding', sub: 'From REQ-0093' },
    { at: '2026-10-06T15:10:00', by: 'sam', text: 'Sam · sent to Priya' },
    { at: '2026-10-07T09:14:00', by: 'priya', text: 'Priya · requested changes', sub: 'HS-11 re-test on 8 East transfers', decision: true },
    { at: '2026-10-07T10:40:00', by: 'sam', text: 'Sam · re-tested HS-11', sub: '0 of 212 would have been blocked' },
    { at: '2026-10-07T10:45:00', by: 'sam', text: 'Sam · sent to Priya again' },
    { at: '2026-10-07T16:02:00', by: 'priya', text: 'Priya · signed as sponsor', sub: 'After one round of changes on HS-11', decision: true },
    { at: '2026-10-13T10:20:00', by: 'dana', text: 'Dana · set Tier 3', sub: 'Suggested Tier 2 · reason recorded', decision: true },
    { at: '2026-10-14T16:20:00', by: 'drlee', text: 'Dr. Lee · approved with conditions C1–C3', sub: 'Reason recorded · 5 of 7 board members present', decision: true },
    { at: '2026-11-05T11:00:00', by: 'marcus', text: 'Marcus · asked Priya to sign', sub: 'PRV-0142 v3 · Shadow → Draft', decision: true },
    { at: '2026-11-06T09:52:00', by: 'priya', text: 'Priya · signed PRV-0142 v3', sub: 'Shadow → Draft · below target, reason recorded', decision: true },
  ],
}

/** Culture Follow-up Agent: started 30 Nov, the job description at 3 of 7, waiting on Marcus (invented). */
const cultureRecord: Onboarding = {
  agentId: 'culture-followup',
  intakeId: 'req-0099',
  startedAt: '2026-11-30T10:00:00',
  startedBy: 'dana',
  version: 3,
  savedAt: '2026-12-07T15:30:00',
  job: {
    purpose: 'Find positive cultures that come back after discharge and draft a follow-up for the pharmacist, so no result waits unseen.',
    activities: [{ id: 'culture-followup-a1', name: 'Follow up positive cultures after discharge', branch: 'No adverse branch: drafts a call note only' }],
    never: [],
    actingFor: null,
    escalation: [],
    targets: { agreement: null, missed: null },
    domain: { units: ['7 West', '8 East'], patients: 'Adults 18+', hours: 'Weekdays' },
  },
  grants: [],
  limits: [],
  sponsor: { state: 'notSent', round: 0, earlier: [] },
  done: { intake: { at: '2026-11-30T10:00:00', by: 'dana' } },
  history: [{ at: '2026-11-30T10:00:00', by: 'dana', text: 'Dana · started onboarding', sub: 'From REQ-0099' }],
}

export const onboardings: Onboarding[] = [medRecRecord, cultureRecord]

/** Agents being onboarded: off every board until AIMS Review approves them. */
export const draftAgents: Agent[] = [agentFromIntake(intakeRequests[1]!, { ownerId: 'marcus', techOwnerId: 'sam' }, '2026-11-30T10:00:00')]
