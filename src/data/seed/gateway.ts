import { addMinutes } from '../../lib/clock'
import type { AgentException, GatewayCaller } from '../types'
import { E11_SHIFT, fromMarch } from './redate'

const d = (iso: string) => fromMarch(iso, E11_SHIFT)

/**
 * 9b (R1: 24 Mar → 08 Dec, R16): three callers this week use hospital credentials with no registry
 * record. The bot looks like REQ-0081, an approved intake that was never onboarded.
 */
const unregistered: GatewayCaller[] = [
  {
    id: 'svc-dc-summary-bot',
    name: 'svc-dc-summary-bot',
    credential: 'Entra app · client 7f3a…c21',
    firstSeen: d('2027-03-08T07:40:00'),
    lastCall: '2026-12-08T09:50:00',
    calls7d: 2318,
    reaches: ['Epic read · notes, 5 South', 'Teams write · 5 South channel'],
    likelyOwner: { name: 'K. Osei', sub: 'Hospital Medicine' },
    does: 'Reads discharge notes on 5 South and posts a summary to the 5 South team channel in Teams.',
    patientData: { flag: 'Notes leave Epic', note: 'Channel has 46 members' },
    registeredBy: 'K. Osei, Hospital Medicine, on 18 Nov',
    intakeId: 'req-0081',
    reliance: '5 South may rely on the summaries',
    group: 'unregistered',
    messages: [],
  },
  {
    id: 'ed-triage-helper',
    name: 'ed-triage-helper',
    credential: 'API key · issued to Emergency',
    firstSeen: d('2027-03-19T11:20:00'),
    lastCall: '2026-12-08T09:31:00',
    calls7d: 412,
    reaches: ['Epic read · ED tracking board'],
    likelyOwner: null,
    does: 'Reads the ED tracking board every few minutes; nothing is written back.',
    registeredBy: 'Key issued to Emergency; the key owner left in Oct',
    group: 'unregistered',
    messages: [],
  },
  {
    id: 'rx-price-check',
    name: 'rx-price-check',
    credential: 'Entra app · client 22be…09d',
    firstSeen: d('2027-03-21T14:05:00'),
    lastCall: '2026-12-08T08:58:00',
    calls7d: 96,
    reaches: ['Pharmacy worklist read'],
    likelyOwner: { name: 'R. Tan', sub: 'Pharmacy purchasing' },
    does: 'Reads drug names and quantities from the pharmacy worklist, a few times an hour.',
    registeredBy: 'R. Tan, Pharmacy purchasing, on 02 Dec',
    group: 'unregistered',
    messages: [],
  },
]

/** Callers with fewer than 20 calls a week (invented). */
const LOW = [
  ['report-export-svc', 'Entra app · client 41c0…7aa', '2026-11-30', 14, 'Epic read · census report', 'IT reporting'],
  ['bed-board-sync', 'API key · issued to Patient flow', '2026-11-26', 11, 'Epic read · bed status', 'Patient flow'],
  ['lab-courier-bot', 'Entra app · client 9e21…b03', '2026-12-02', 9, 'Teams write · lab courier channel', 'Lab services'],
  ['diet-order-check', 'API key · issued to Nutrition', '2026-11-24', 7, 'Epic read · diet orders', 'Nutrition'],
  ['transport-notify', 'Entra app · client 5d77…e12', '2026-12-04', 6, 'Teams write · transport channel', 'Patient transport'],
  ['wound-photo-index', 'Entra app · client c3a8…41f', '2026-11-28', 4, 'Epic read · media index', 'Wound care'],
  ['pharmacy-shift-poll', 'API key · issued to Pharmacy', '2026-12-05', 3, 'Pharmacy worklist read', 'Pharmacy'],
] as const

/** Callers already dismissed as not agents, each with its reason (invented). */
const DISMISSED = [
  ['epic-uptime-probe', 'Health check every minute; no patient data'],
  ['teams-room-booker', 'Books meeting rooms; no clinical systems'],
  ['badge-sync', 'Badge photos for security; no patient data'],
  ['printer-status', 'Printer queue status only'],
  ['backup-verify', 'Nightly backup checks by IT'],
  ['sso-test-account', 'Single sign-on test login'],
  ['pager-gateway', 'Forwards pages; registered with IT'],
  ['formulary-mirror', 'Copies the formulary for the website'],
  ['shift-roster-sync', 'Staffing roster; no patient data'],
  ['vpn-health', 'VPN health checks'],
  ['survey-mailer', 'Patient survey emails; owned by Patient experience'],
  ['wifi-heatmap', 'Wi-Fi coverage reports'],
] as const

export const callers: GatewayCaller[] = [
  ...unregistered,
  ...LOW.map(([name, credential, day, calls, reaches, owner]): GatewayCaller => ({
    id: name,
    name,
    credential,
    firstSeen: `${day}T08:00:00`,
    lastCall: '2026-12-07T16:00:00',
    calls7d: calls,
    reaches: [reaches],
    likelyOwner: { name: owner, sub: 'department' },
    group: 'lowVolume',
    messages: [],
  })),
  ...DISMISSED.map(([name, reason], i): GatewayCaller => ({
    id: name,
    name,
    credential: 'Entra app',
    firstSeen: `2026-${i < 6 ? '10' : '11'}-${String(3 + i * 2).padStart(2, '0')}T08:00:00`,
    lastCall: '2026-12-08T09:00:00',
    calls7d: 40 + i * 13,
    reaches: ['Various'],
    likelyOwner: null,
    group: 'dismissed',
    decision: { kind: 'notAgent', reason, by: 'dana', at: `2026-${i < 6 ? '10' : '11'}-${String(4 + i * 2).padStart(2, '0')}T10:00:00` },
    messages: [],
  })),
]

/** One inbox item per unregistered caller, for Dana (9b "flagged to Dana"); hand-offs with a link. */
export const gatewayItems: AgentException[] = unregistered.map((c, i): AgentException => {
  const code = ['EXC-5482', 'EXC-5499', 'EXC-5500'][i]!
  return {
    id: code.toLowerCase(),
    code,
    status: 'review',
    kind: 'review',
    type: 'Unregistered caller',
    reason: `${c.name} uses hospital credentials with no registry record: ${c.reaches.join(', ')}.`,
    short: 'unregistered caller',
    // Not an agent yet: the item is about a caller (the inbox names it from `from`).
    agentId: '',
    from: c.name,
    raisedAt: addMinutes(c.firstSeen, 15),
    action: 'decide what it is',
    actionSub: `${c.calls7d.toLocaleString('en-US')} calls in 7 days`,
    ownerId: 'dana',
    copied: [],
    deadline: '2026-12-10T17:00:00',
    state: 'new',
    route: 'inbox',
    link: { label: 'Open caller', to: `/inventory/unregistered/${c.id}` },
  }
})
