import type { AgentException, DemoState, LogEvent, PersonaId, Status } from '../../data/types'
import { formatClock, formatDue, formatAgo, minutesBetween } from '../../lib/clock'
import { personName } from '../board/selectors'

export const isOpen = (e: AgentException) => e.state !== 'resolved' && e.state !== 'dismissed'
export const isOverdue = (e: AgentException, now: string) => isOpen(e) && e.deadline < now
/** Past its deadline with nobody on it: it goes to the division's sponsor. */
export const isEscalated = (e: AgentException, now: string) => isOverdue(e, now) && !e.claimedAt && e.kind !== 'incident'
const isSnoozed = (e: AgentException, now: string) => Boolean(e.snoozedUntil && e.snoozedUntil > now)

export interface InboxItemView {
  id: string
  status: Status
  type: string
  /** "Formulary Swap Agent · MON-02 v1", "Sam · Med Rec Agent", "Formulary Swap Agent · escalated" */
  source: string
  due: string
  /** Due within two hours, or late: the due line is set in ink and bold (5a). */
  dueSoon: boolean
  late: boolean
  reason: string
  action: string
  escalated: boolean
}

function sponsorOf(s: DemoState, e: AgentException): string | undefined {
  const agent = s.agents.find((a) => a.id === e.agentId)
  return s.divisions.find((d) => d.id === agent?.divisionId)?.sponsorId
}

function itemView(s: DemoState, e: AgentException, viewer: PersonaId): InboxItemView {
  const agent = s.agents.find((a) => a.id === e.agentId)
  const escalated = isEscalated(e, s.now) && e.ownerId !== viewer
  const reason =
    escalated && e.status === 'stale' && agent
      ? `No data for ${formatAgo(agent.monitor.lastSeen, s.now).replace(' ago', '')}. ${personName(s, e.ownerId)} didn’t answer by ${formatClock(e.deadline)}.`
      : e.reason
  return {
    id: e.id,
    status: e.status,
    type: e.type,
    source: escalated
      ? `${agent?.name} · escalated`
      : e.from
        ? `${personName(s, e.from)} · ${agent?.name}`
        : `${agent?.name}${e.ruleTag ? ` · ${e.ruleTag}` : ''}`,
    due: formatDue(e.deadline, s.now),
    dueSoon: minutesBetween(s.now, e.deadline) <= 120,
    late: isOverdue(e, s.now),
    reason,
    action: escalated ? 'Action: assign it, or answer it yourself' : `Action: ${e.action}`,
    escalated,
  }
}

/** A persona's inbox: what they own (or what escalated to them), what they're copied on, and the log. */
export function selectInbox(s: DemoState, personaId: PersonaId): { needsMe: InboxItemView[]; waiting: InboxItemView[]; log: LogEvent[]; logTotal: number } {
  const open = s.exceptions.filter((e) => isOpen(e) && !isSnoozed(e, s.now))
  const mine = open.filter((e) => e.ownerId === personaId || (isEscalated(e, s.now) && sponsorOf(s, e) === personaId))
  const waiting = open.filter((e) => !mine.includes(e) && e.copied.includes(personaId) && e.ownerId !== personaId)
  const byDeadline = (a: AgentException, b: AgentException) => a.deadline.localeCompare(b.deadline)
  return {
    needsMe: [...mine].sort(byDeadline).map((e) => itemView(s, e, personaId)),
    waiting: [...waiting].sort(byDeadline).map((e) => itemView(s, e, personaId)),
    log: s.logEvents,
    logTotal: s.logEvents.length,
  }
}

/** Everything the inbox detail panel shows for one exception (5a, 5d). */
export function selectExceptionDetail(s: DemoState, id: string) {
  const e = s.exceptions.find((x) => x.id === id)
  if (!e) return null
  const agent = s.agents.find((a) => a.id === e.agentId)
  const sponsor = personName(s, sponsorOf(s, e))
  const owner = personName(s, e.ownerId)
  const dueText = formatDue(e.deadline, s.now).replace(/^Due /, '')
  const sameDay = /^\d\d:\d\d$/.test(dueText)
  const escalated = isEscalated(e, s.now)
  return {
    id: e.id,
    code: e.code,
    status: e.status,
    type: e.type,
    kind: e.kind,
    state: e.state,
    agentId: e.agentId,
    agentName: agent?.name ?? '',
    headline: e.detail?.headline ?? e.reason,
    meta: [e.code, e.ruleTag, `raised ${formatClock(e.raisedAt)}`, `due ${sameDay ? `today ${dueText}` : dueText}`, owner].filter(Boolean).join(' · '),
    escalated,
    escalationLine: escalated ? `Escalated to ${sponsor} at ${formatClock(e.deadline)}` : `Not handled by ${formatClock(e.deadline)} → goes to ${sponsor}`,
    ownerName: owner,
    sponsorName: sponsor,
    trendLabel: e.detail?.trendLabel,
    trend: e.detail?.trend,
    target: e.detail?.target,
    breakdownLabel: e.detail?.breakdownLabel,
    breakdown: e.detail?.breakdown ?? [],
    cause: e.detail?.cause,
    timeline: (e.detail?.timeline ?? []).map((t) => ({ at: formatClock(t.at), title: t.title, sub: t.sub })),
    silence: e.detail?.silence,
    tune: e.detail?.tune,
    /** The rule without its version, e.g. 'MR-12'. */
    ruleName: e.ruleTag?.split(' ')[0],
    action: e.action,
    copied: e.copied.map((p) => personName(s, p)),
  }
}

export type ExceptionDetailView = NonNullable<ReturnType<typeof selectExceptionDetail>>

/** "Marcus · Medications": who is viewing, and the division they work in (or all of them). */
export function selectInboxHeader(s: DemoState, personaId: PersonaId): { status: string; divisionId: string | undefined } {
  const roles = s.roles.filter((r) => r.personId === personaId)
  const divisionId = roles.some((r) => r.divisionId === 'all') ? undefined : roles[0]?.divisionId
  const division = s.divisions.find((d) => d.id === divisionId)
  return { status: `${personName(s, personaId)} · ${division?.name ?? 'All divisions'}`, divisionId }
}
