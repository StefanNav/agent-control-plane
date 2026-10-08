import type { AgentException, DemoState, LogEvent, PersonaId, Status } from '../../data/types'
import {
  addMinutes,
  formatAgo,
  formatClock,
  formatDate,
  formatDay,
  formatDue,
  minutesBetween,
} from '../../lib/clock'
import { onBoard, personName } from '../board/selectors'

export const isOpen = (e: AgentException) => e.state !== 'resolved' && e.state !== 'dismissed'
export const isOverdue = (e: AgentException, now: string) => isOpen(e) && e.deadline < now
/** Past its deadline with nobody on it: it goes to the division's sponsor until someone claims or reassigns it. */
/** Hand-offs with a link (onboarding, signatures) are done on their step; they never escalate to the sponsor. */
export const isEscalated = (e: AgentException, now: string) =>
  isOverdue(e, now) && !e.claimedAt && !e.assignedAt && e.kind !== 'incident' && !e.link
const isSnoozed = (e: AgentException, now: string) =>
  Boolean(e.snoozedUntil && e.snoozedUntil > now)

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

/** The division's escalation chain for an item (8a). */
function chainOf(s: DemoState, e: AgentException) {
  const agent = s.agents.find((a) => a.id === e.agentId)
  return s.divisions.find((d) => d.id === agent?.divisionId)?.escalation
}

/**
 * Who an unanswered item has reached (8a): the chain's first person once it is past its deadline,
 * and the second as well once `afterHours` more have passed. Empty while it isn't escalated.
 */
export function escalationOf(s: DemoState, e: AgentException): string[] {
  const chain = chainOf(s, e)
  if (!chain || !isEscalated(e, s.now)) return []
  const second = addMinutes(e.deadline, chain.afterHours * 60)
  return s.now >= second && chain.then !== chain.first ? [chain.first, chain.then] : [chain.first]
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
export function selectInbox(
  s: DemoState,
  personaId: PersonaId,
): { needsMe: InboxItemView[]; waiting: InboxItemView[]; log: LogEvent[]; logTotal: number } {
  const open = s.exceptions.filter((e) => isOpen(e) && !isSnoozed(e, s.now))
  const mine = open.filter(
    (e) => e.ownerId === personaId || escalationOf(s, e).includes(personaId),
  )
  const waiting = open.filter(
    (e) => !mine.includes(e) && e.copied.includes(personaId) && e.ownerId !== personaId,
  )
  const byDeadline = (a: AgentException, b: AgentException) => a.deadline.localeCompare(b.deadline)
  return {
    needsMe: [...mine].sort(byDeadline).map((e) => itemView(s, e, personaId)),
    waiting: [...waiting].sort(byDeadline).map((e) => itemView(s, e, personaId)),
    log: s.logEvents,
    logTotal: s.logEvents.length,
  }
}

/** "15:00" today, "tomorrow 17:00", or "11 Dec 17:00". */
function clockWithDay(iso: string, now: string): string {
  const days = Math.round(
    minutesBetween(`${now.slice(0, 10)}T00:00:00`, `${iso.slice(0, 10)}T00:00:00`) / (24 * 60),
  )
  if (days === 0) return formatClock(iso)
  return `${days === 1 ? 'tomorrow' : formatDate(iso)} ${formatClock(iso)}`
}

/** Everything the inbox detail panel shows for one exception, as `viewer` sees it (5a, 5b, 5d). */
export function selectExceptionDetail(s: DemoState, id: string, viewer: PersonaId) {
  const e = s.exceptions.find((x) => x.id === id)
  if (!e) return null
  const agent = s.agents.find((a) => a.id === e.agentId)
  const chain = chainOf(s, e)
  const sponsor = personName(s, chain?.first)
  const owner = personName(s, e.ownerId)
  const escalated = isEscalated(e, s.now)
  const reached = escalationOf(s, e)
  const escalatedToViewer = reached.includes(viewer)
  const reachedLine = reached
    .map((id, i) => `${personName(s, id)} at ${formatClock(i === 0 ? e.deadline : addMinutes(e.deadline, (chain?.afterHours ?? 0) * 60))}`)
    .join(', then ')
  const closedState = e.state === 'resolved' || e.state === 'dismissed'
  const closer = personName(s, e.closedBy ?? e.ownerId)
  const closed = closedState
    ? {
        lead: `${e.state === 'dismissed' ? 'Dismissed' : 'Resolved'} by ${closer}${e.closedAt ? ` at ${formatClock(e.closedAt)}` : ''}.`,
        text:
          e.state === 'dismissed'
            ? (e.dismissReason ?? '')
            : [e.outcome, e.outcomeSub].filter(Boolean).join(' · '),
      }
    : null
  /** Where the item stands against its deadline; never a time that has already passed. */
  const line =
    closedState || e.kind === 'incident'
      ? null
      : escalated
        ? escalatedToViewer
          ? null
          : `Escalated to ${reachedLine}`
        : e.claimedAt
          ? `Claimed by ${owner} at ${formatClock(e.claimedAt)}`
          : e.assignedAt
            ? `Assigned to ${owner} at ${formatClock(e.assignedAt)}`
            : `Not handled by ${clockWithDay(e.deadline, s.now)} → goes to ${sponsor}`
  const lastSeen = agent?.monitor.lastSeen
  const silentFor =
    e.status === 'stale' && lastSeen ? formatAgo(lastSeen, s.now).replace(' ago', '') : null
  const reminder = e.detail?.timeline?.find((t) => t.title.startsWith('Reminder') && t.at <= s.now)
  const techOwner = agent?.techOwnerId
  return {
    id: e.id,
    code: e.code,
    link: e.link,
    status: e.status,
    type: e.type,
    kind: e.kind,
    state: e.state,
    agentId: e.agentId,
    agentName: agent?.name ?? '',
    headline: `${e.detail?.headline ?? e.reason}${silentFor ? ` for ${silentFor}` : ''}`,
    meta: (closedState
      ? [
          e.code,
          e.ruleTag,
          `raised ${formatClock(e.raisedAt)}`,
          `due ${formatClock(e.deadline)}`,
          e.closedAt ? `closed ${formatClock(e.closedAt)}` : '',
          owner,
        ]
      : escalated
        ? [
            e.code,
            e.ruleTag,
            `raised ${formatClock(e.raisedAt)}`,
            `due ${formatClock(e.deadline)}`,
            `escalated ${formatClock(e.deadline)}`,
          ]
        : [
            e.code,
            e.ruleTag,
            `raised ${formatClock(e.raisedAt)}`,
            dueWithDay(e.deadline, s.now).replace(/^Due/, 'due'),
            owner,
          ]
    )
      .filter(Boolean)
      .join(' · '),
    /** Why it reached the sponsor (5d); no gendered pronouns in product copy. */
    escalationNotice: escalatedToViewer
      ? `${owner} is the owner. It reached their inbox at ${formatClock(e.raisedAt)}${reminder ? `, with a reminder at ${formatClock(reminder.at)}` : ''}, and they're still copied.`
      : null,
    techOwnerId: techOwner,
    techOwnerName: techOwner ? personName(s, techOwner) : undefined,
    escalated,
    escalatedToViewer,
    escalationLine: line,
    closed,
    incidentId: e.incidentId,
    ownerName: owner,
    sponsorName: sponsor,
    trendLabel: e.detail?.trendLabel,
    trend: e.detail?.trend,
    target: e.detail?.target,
    breakdownLabel: e.detail?.breakdownLabel,
    breakdown: e.detail?.breakdown ?? [],
    cause: e.detail?.cause,
    timeline: (e.detail?.timeline ?? [])
      .filter((t) => t.at <= s.now)
      .map((t) => ({ at: formatClock(t.at), title: t.title, sub: t.sub })),
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
export function selectInboxHeader(
  s: DemoState,
  personaId: PersonaId,
): { status: string; divisionId: string | undefined } {
  const roles = s.roles.filter((r) => r.personId === personaId)
  const divisionId = roles.some((r) => r.divisionId === 'all') ? undefined : roles[0]?.divisionId
  const division = s.divisions.find((d) => d.id === divisionId)
  return {
    status: `${personName(s, personaId)} · ${division?.name ?? 'All divisions'}`,
    divisionId,
  }
}

/** "Due today 15:00" for a same-day deadline; otherwise formatDue's "Due tomorrow", "Due Friday"… */
function dueWithDay(deadline: string, now: string): string {
  const due = formatDue(deadline, now)
  return /^Due \d\d:\d\d$/.test(due) ? due.replace('Due ', 'Due today ') : due
}

/** Statuses that mean an agent acted outside its job description. */
const OUT_OF_SCOPE: Status[] = ['crit', 'warn', 'review']

/**
 * The 07:00 email (5c). Items due within two hours reach you as they happen, so the digest
 * carries what can wait for the morning; changes from yesterday; and the size of the log.
 */
export function selectDigest(s: DemoState, personaId: PersonaId) {
  const { divisionId } = selectInboxHeader(s, personaId)
  const division = s.divisions.find((d) => d.id === divisionId)
  const agents = s.agents.filter((a) => onBoard(a) && (!divisionId || a.divisionId === divisionId))
  const within = agents.filter((a) => !OUT_OF_SCOPE.includes(a.judgment.status)).length
  const pages = s.divisions.filter((d) => (!divisionId || d.id === divisionId) && d.page).length
  const open = s.exceptions.filter((e) => isOpen(e) && !isSnoozed(e, s.now))
  const needs = selectInbox(s, personaId)
    .needsMe.filter((item) => !item.dueSoon)
    .map((item) => {
      const e = open.find((x) => x.id === item.id)!
      const agent = s.agents.find((a) => a.id === e.agentId)
      const question = e.kind === 'question'
      return {
        id: e.id,
        status: e.status,
        label: question && e.from ? `Question from ${personName(s, e.from)}` : e.type,
        text: question ? (e.short ?? e.reason) : `${agent?.name} · ${e.short ?? e.reason}`,
        due: dueWithDay(e.deadline, s.now),
        link: question ? 'Answer' : 'Open',
      }
    })
  return {
    from: 'AIMS · Lakeshore Health',
    to: personName(s, personaId),
    subject: `${division?.name ?? 'All divisions'} · daily digest · ${formatDay(s.now)}`,
    title: `${needs.length} ${needs.length === 1 ? 'thing needs' : 'things need'} you today`,
    sub: `${within} of ${agents.length} agents within scope overnight. ${pages ? `${pages} ${pages === 1 ? 'page' : 'pages'} went out.` : 'Nothing paged you.'}`,
    needs,
    changes: s.changeEvents,
    logTotal: s.logEvents.length,
  }
}

/** Every log event, newest first, with the agent named (the inbox Log tab). */
export function selectLog(s: DemoState) {
  return [...s.logEvents]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((e) => {
      const agent = s.agents.find((a) => a.id === e.agentId)?.name
      return {
        id: e.id,
        time: formatClock(e.at),
        text: e.text,
        sub: [agent, e.sub].filter(Boolean).join(' · '),
      }
    })
}
