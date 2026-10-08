import type { AgentRowView, LadderState, PrivilegeCardView } from '../../components'
import type { Agent, AgentException, DemoState, Level, Status } from '../../data/types'
import { formatAge, formatAgo, formatClock, formatClockSeconds, formatDate, formatDay, formatRelative, minutesBetween } from '../../lib/clock'
import { trendPoints } from '../../lib/trend'
import { queueOf } from '../../store/mutations'

/** Statuses that need a human. */
export const ATTENTION: Status[] = ['crit', 'warn', 'review', 'stale']

/** Retired agents are archived: they leave every board, division, tile and wall count. */
export const onBoard = (a: Agent) => a.lifecycle !== 'retired'

/** Board order: critical, then anything needing a human, then fine, paused, shadow. Ties keep seed order. */
export function severityRank(status: Status): number {
  return { crit: 0, warn: 1, review: 1, stale: 1, normal: 2, paused: 3, shadow: 4 }[status]
}

const LEVEL_NAME: Record<Level, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }
const LADDER: Record<Level, LadderState[]> = {
  shadow: ['current', 'available', 'locked', 'locked'],
  draft: ['passed', 'current', 'locked', 'locked'],
  supervised: ['passed', 'passed', 'current', 'locked'],
  autonomous: ['passed', 'passed', 'passed', 'current'],
}

export const personName = (s: DemoState, id: string | undefined): string => s.people.find((p) => p.id === id)?.name ?? '—'
export const shortName = (name: string) => name.replace(/, PharmD/, '')
const isOpen = (e: AgentException) => e.state !== 'resolved' && e.state !== 'dismissed'
const pct = (v: number | null | undefined, space = false) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}${space ? ' ' : ''}%`)
const count = (v: number | null) => (v === null ? '—' : String(v))
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Monitoring freshness: live within one interval, delayed within three, stale beyond. */
export function monitorFreshness(lastSeen: string, intervalMin: number, now: string): 'live' | 'delayed' | 'stale' {
  const since = minutesBetween(lastSeen, now)
  if (since > intervalMin * 3) return 'stale'
  return since > intervalMin ? 'delayed' : 'live'
}

/** The open exception that explains an agent's judgment, if any. */
function attentionException(s: DemoState, agentId: string): AgentException | undefined {
  return s.exceptions.find((e) => e.agentId === agentId && isOpen(e) && ATTENTION.includes(e.status))
}

export interface DivisionSummary {
  id: string
  name: string
  owner: string
  agentCount: number
  status: Status
  judgment: string
  breakdown: string
  counts: Partial<Record<Status, number>>
  needsHuman: number
  /** Open exceptions per day, last 7 days. */
  exceptionsByDay: number[]
  /** Quiet divisions: "No open exceptions · 1 closed this week", "3 agents in shadow · nothing reaches patients". */
  quietNote: string
  page?: { at: string; ackAt?: string; who: string }
  incidentId?: string
  note?: string
  resumeNeeds?: string[]
  attention: { agentId: string; name: string; status: Status; reason: string; age: string }[]
  nextDeadline?: { at: string; to: string }
  agentStatuses: Status[]
}

/** One row per division for the hospital board (4a, 4d, 4e), needing-a-human first. */
export function selectDivisionSummaries(s: DemoState): DivisionSummary[] {
  const summaries = s.divisions.map((d): DivisionSummary => {
    const agents = s.agents.filter((a) => onBoard(a) && a.divisionId === d.id)
    const attentionAgents = agents.filter((a) => ATTENTION.includes(a.judgment.status))
    const counts: Partial<Record<Status, number>> = {}
    for (const a of attentionAgents) counts[a.judgment.status] = (counts[a.judgment.status] ?? 0) + 1
    const crit = attentionAgents.find((a) => a.judgment.status === 'crit')
    const allShadow = agents.length > 0 && agents.every((a) => a.judgment.status === 'shadow')
    const status: Status = crit
      ? 'crit'
      : (['warn', 'review', 'stale'] as const).find((st) => counts[st]) ?? (allShadow ? 'shadow' : 'normal')
    const judgment = crit
      ? crit.judgment.label
      : attentionAgents.length
        ? `${plural(attentionAgents.length, 'agent needs', 'agents need')} a human`
        : allShadow
          ? `Shadow · ${plural(agents.length, 'agent', 'agents')}`
          : 'Within scope'
    const parts = [
      counts.crit ? plural(counts.crit, 'critical', 'critical') : '',
      counts.warn ? plural(counts.warn, 'warning', 'warnings') : '',
      counts.review ? plural(counts.review, 'review', 'reviews') : '',
      counts.stale ? `${counts.stale} stale` : '',
    ].filter(Boolean)
    const open = s.exceptions
      .filter((e) => isOpen(e) && ATTENTION.includes(e.status) && agents.some((a) => a.id === e.agentId))
      .filter((e) => e.kind !== 'incident')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
    const next = open.find((e) => e.deadline >= s.now)
    return {
      id: d.id,
      name: d.name,
      owner: personName(s, d.ownerId),
      agentCount: agents.length,
      status,
      judgment,
      breakdown: parts.length ? parts.join(' · ') : 'None',
      counts,
      needsHuman: attentionAgents.length,
      exceptionsByDay: d.exceptionsByDay,
      quietNote: allShadow
        ? `${plural(agents.length, 'agent', 'agents')} in shadow · nothing reaches patients`
        : `No open exceptions${d.closedThisWeek ? ` · ${d.closedThisWeek} closed this week` : ''}`,
      ...(d.page ? { page: d.page } : {}),
      ...(d.incidentId ? { incidentId: d.incidentId } : {}),
      ...(d.note ? { note: d.note } : {}),
      ...(d.resumeNeeds ? { resumeNeeds: d.resumeNeeds } : {}),
      attention: attentionAgents.map((a) => {
        const e = attentionException(s, a.id)
        return {
          agentId: a.id,
          name: a.name,
          status: a.judgment.status,
          reason: e?.short ?? a.judgment.label.toLowerCase(),
          age: e ? formatAge(e.raisedAt, s.now) : '',
        }
      }),
      ...(next ? { nextDeadline: { at: formatClock(next.deadline), to: personName(s, d.sponsorId) } } : {}),
      agentStatuses: agents.map((a) => a.judgment.status),
    }
  })
  return summaries
    .map((summary, i) => ({ summary, i }))
    .sort((a, b) => Number(b.summary.needsHuman > 0) - Number(a.summary.needsHuman > 0) || severityRank(a.summary.status) - severityRank(b.summary.status) || a.i - b.i)
    .map(({ summary }) => summary)
}

function agentRow(s: DemoState, a: Agent, index: number): AgentRowView {
  // No data (stale) or not running (paused): the last numbers would mislead, so they're withdrawn.
  const withdrawn = a.judgment.status === 'stale' || a.lifecycle === 'paused'
  const m = a.metrics
  return {
    id: a.id,
    status: a.judgment.status,
    label: a.judgment.label,
    ...(a.judgment.ruleTag ? { ruleTag: a.judgment.ruleTag } : {}),
    name: a.name,
    version: a.version,
    day: withdrawn ? '—' : count(m.day),
    signedAsIs: withdrawn ? '—' : pct(m.signedAsIs),
    edited: withdrawn ? '—' : pct(m.edited),
    blocked: withdrawn ? '—' : count(m.blocked),
    trend: trendPoints(index, m.trend),
    ladder: LADDER[a.level],
    level: LEVEL_NAME[a.level],
    grantor: personName(s, a.grantorId),
    reviewDate: formatDate(a.reviewDate),
  }
}

/** The division board's rows, judgment first (4b). */
export function selectAgentRows(s: DemoState, divisionId: string): AgentRowView[] {
  return s.agents
    .filter((a) => onBoard(a) && a.divisionId === divisionId)
    .map((a, i) => ({ row: agentRow(s, a, i), i }))
    .sort((a, b) => severityRank(a.row.status) - severityRank(b.row.status) || a.i - b.i)
    .map(({ row }) => row)
}

function activitiesOf(s: DemoState, agentId: string) {
  return s.activities
    .filter((act) => act.agentId === agentId)
    .map((act) => {
      const prv = s.privileges.find((p) => p.activityId === act.id && p.state !== 'closed')
      const agentPaused = s.agents.find((a) => a.id === agentId)?.lifecycle === 'paused'
      return {
        id: act.id,
        name: act.name,
        level: agentPaused || act.paused ? `Paused · was ${LEVEL_NAME[act.level]}` : LEVEL_NAME[act.level],
        grantor: personName(s, prv?.grantedBy),
        grantedAt: prv?.grantedAt ? formatDate(prv.grantedAt) : '',
        review: prv?.reviewDate ? formatDate(prv.reviewDate) : '—',
        domain: prv?.domain ?? '',
        today: act.today ?? '',
      }
    })
}

/** The division view's right-hand panel for the selected agent (4b). */
export function selectAgentPanel(s: DemoState, agentId: string) {
  const a = s.agents.find((x) => x.id === agentId)
  if (!a) return null
  const m = a.metrics
  // No data (stale) or not running (paused): the last numbers would mislead, so they're withdrawn.
  const withdrawn = a.judgment.status === 'stale' || a.lifecycle === 'paused'
  const rejected = m.rejected ?? (m.signedAsIs !== null && m.edited !== null ? Math.max(0, 100 - m.signedAsIs - m.edited) : null)
  const actions = m.weekActions ?? (m.day === null ? null : m.day * 7)
  return {
    id: a.id,
    name: a.name,
    idLine: `${a.version} · built in ${a.platform} · ${a.code}`,
    status: a.judgment.status,
    label: a.judgment.label,
    ruleTag: a.judgment.ruleTag,
    judgedAt: a.judgedAt ? formatClock(a.judgedAt) : '',
    people: `Owner ${personName(s, a.ownerId)} · sponsor ${personName(s, a.sponsorId)} · technical owner ${personName(s, a.techOwnerId)}`,
    activities: activitiesOf(s, a.id),
    week: {
      actions: withdrawn || actions === null ? '—' : actions.toLocaleString('en-US'),
      asIs: withdrawn ? '—' : pct(m.signedAsIs),
      edited: withdrawn ? '—' : pct(m.edited),
      rejected: withdrawn ? '—' : pct(rejected),
      blocked: withdrawn ? '—' : count(m.blocked),
    },
    recent: s.actions
      .filter((x) => x.agentId === a.id)
      .slice(0, 2)
      .map((x) => ({ id: x.id, at: formatClockSeconds(x.at), title: x.title, outcome: `${x.reviewerOutcome} · ${shortName(x.actingFor).split(' · ')[0]}` })),
  }
}

/** The agent view (4c). Null for an unknown agent, which the page shows as Not found. */
export function selectAgentOverview(s: DemoState, agentId: string) {
  const a = s.agents.find((x) => x.id === agentId)
  if (!a) return null
  const m = a.metrics
  const e = attentionException(s, a.id)
  const stops = s.hardStops.filter((h) => h.agentId === a.id)
  const fired = stops.reduce((sum, h) => sum + h.firedToday, 0)
  const firedRules = stops.filter((h) => h.firedToday > 0).map((h) => h.code)
  const division = s.divisions.find((d) => d.id === a.divisionId)
  const mainPrivilege = s.privileges.find((p) => p.agentId === a.id && p.level === a.level)
  const freshness = monitorFreshness(a.monitor.lastSeen, a.monitor.expectedIntervalMin, s.now)
  const rejected = m.rejected ?? (m.signedAsIs !== null && m.edited !== null ? Math.max(0, 100 - m.signedAsIs - m.edited) : null)
  const pausedAt = a.lifecycle === 'paused' ? a.pausedAt : undefined
  const incident = s.incidents.find((i) => i.agentId === a.id && i.state !== 'closed')
  const pausedMinutes = pausedAt ? minutesBetween(pausedAt, s.now) : 0
  return {
    id: a.id,
    name: a.name,
    division: division?.name ?? '',
    divisionId: a.divisionId,
    levelLine: pausedAt ? `Paused · since ${formatClock(pausedAt)}` : `${LEVEL_NAME[a.level]}${mainPrivilege?.grantedAt ? ` · since ${formatDate(mainPrivilege.grantedAt)}` : ''}`,
    /** The paused state (6d): who, when, what happened to the work, and how long it has been. */
    paused:
      pausedAt && a.pause
        ? {
            lead: `Paused by ${personName(s, a.pausedBy)} at ${formatClock(pausedAt)}.`,
            text: `${a.pause.routed} drafts went to pharmacists. ${
              a.divisionId === 'medications' ? 'New admissions on 7 West and 8 East are reconciled' : 'New work is handled'
            } by hand until both of you approve a resume.`,
            whilePaused: {
              routed: `${a.pause.routed} at ${formatClock(pausedAt)}`,
              byHand: `${Math.round((queueOf(a).perHour * pausedMinutes) / 60)} since`,
              incident: incident ? `${incident.code} · ${personName(s, incident.commanderId)}` : null,
              incidentId: incident?.id ?? null,
              pausedFor: formatAgo(pausedAt, s.now).replace(/ ago$/, ''),
            },
          }
        : null,
    idLine: `${a.version}${a.sop ? ` · SOP ${a.sop}` : ''} · ${a.code}`,
    judgment: a.judgment,
    lifecycle: a.lifecycle,
    banner: e
      ? {
          exceptionId: e.id,
          status: e.status,
          headline: e.detail?.headline ?? e.reason,
          cause: e.detail?.cause ?? '',
          action: e.type.replace(/^Review: /, 'Review '),
          ruleTag: e.ruleTag,
        }
      : null,
    stats: [
      { label: 'Drafts today', value: a.today ? String(a.today.drafts) : count(m.day), sub: a.today ? `about ${a.today.expected} expected` : 'last 24 h' },
      { label: 'Signed as is', value: pct(m.signedAsIs, true), sub: 'target ≥ 85 %' },
      { label: 'Edited', value: pct(m.edited, true), sub: 'target ≤ 10 %' },
      { label: 'Rejected', value: pct(rejected, true), sub: 'target ≤ 3 %' },
      { label: 'Hard stops fired', value: String(fired), sub: firedRules.length ? `today · all ${firedRules.join(', ')}` : 'today' },
    ],
    activities: activitiesOf(s, a.id).map((act, i) => ({ ...act, trend: trendPoints(i + 3, m.trend) })),
    // 4c lists the five newest; the Actions tab and 7a have the rest.
    recent: s.actions
      .filter((x) => x.agentId === a.id)
      .slice(0, 5)
      .map((x) => ({
        id: x.id,
        code: x.code,
        at: formatClock(x.at),
        title: x.title.replace('encounter ', 'enc '),
        actingFor: shortName(x.actingFor),
        policy: x.blockedBy ? `${x.blockedBy} · blocked` : 'Passed',
        blocked: Boolean(x.blockedBy),
        reviewer: x.reviewerOutcome,
      })),
    hardStops: stops.map((h) => ({ tag: `${h.code} v${h.version}`, title: h.title, fired: h.firedToday ? `${h.firedToday} fired` : '0' })),
    monitoring: {
      interval: `Data arrives every ${a.monitor.expectedIntervalMin} minutes`,
      last: `${formatClock(a.monitor.lastSeen)} · ${formatAgo(a.monitor.lastSeen, s.now)}`,
      gateway: `${a.gateway ?? 'gw-east-2'} · ${freshness === 'stale' ? 'no data' : 'healthy'}`,
      freshness,
    },
    people: [
      { role: 'Owner', name: personName(s, a.ownerId) },
      { role: 'Sponsor', name: personName(s, a.sponsorId) },
      { role: 'Technical owner', name: personName(s, a.techOwnerId) },
    ],
  }
}

export type AgentOverview = NonNullable<ReturnType<typeof selectAgentOverview>>
export type AgentPanel = NonNullable<ReturnType<typeof selectAgentPanel>>

/** Every open exception that needs a human, hospital-wide: critical first, then by deadline (4f). */
export function selectOpenExceptions(s: DemoState) {
  const nextByDivision = new Map(selectDivisionSummaries(s).map((d) => [d.id, d]))
  return s.exceptions
    .filter((e) => isOpen(e) && ATTENTION.includes(e.status))
    .sort((a, b) => Number(b.status === 'crit') - Number(a.status === 'crit') || a.deadline.localeCompare(b.deadline))
    .map((e) => {
      const agent = s.agents.find((a) => a.id === e.agentId)!
      const division = s.divisions.find((d) => d.id === agent.divisionId)!
      const summary = nextByDivision.get(division.id)
      const time = formatDate(e.deadline) === formatDate(s.now) ? formatClock(e.deadline) : formatDate(e.deadline)
      const isNext = summary?.nextDeadline?.at === formatClock(e.deadline) && formatDate(e.deadline) === formatDate(s.now)
      return {
        id: e.id,
        status: e.status,
        type: e.type,
        reason: e.boardReason ?? e.reason,
        agent: agent.name,
        agentId: agent.id,
        isNext,
        division: division.name,
        owner: personName(s, e.ownerId),
        age: formatAge(e.raisedAt, s.now),
        deadline: e.kind === 'incident' ? 'Incident open' : isNext ? `${time} → ${summary!.nextDeadline!.to}` : time,
      }
    })
}

/** "Last 24 hours" on the exceptions-first board. */
export function selectLast24h(s: DemoState) {
  const paged = s.divisions.filter((d) => d.page)
  const today = formatDate(s.now)
  const closedToday = s.exceptions.filter((e) => !isOpen(e) && e.closedAt && formatDate(e.closedAt) === today).length
  return {
    pages: paged.length ? `${paged.length} · ${paged.map((d) => `${personName(s, d.page!.who)}, ${formatClock(d.page!.at)}`).join('; ')}` : '0',
    pauses: String(s.agents.filter((a) => onBoard(a) && a.lifecycle === 'paused').length),
    closed: `${s.stats24h.closedEarlier + closedToday} · median ${s.stats24h.medianCloseMin} min`,
  }
}

const PRIVILEGE_STATUS = {
  awaiting: () => 'Awaiting signature',
  active: () => 'Active',
  due: (s: DemoState, review?: string) => (review && review < s.now ? 'Review overdue' : `Review due ${review ? formatRelative(review, s.now) : ''}`.trim()),
  lapsed: () => 'Lapsed to Shadow',
  steppedDown: (_s: DemoState, _r?: string, trigger?: string) => `Stepped down${trigger ? ` by ${trigger}` : ''}`,
  closed: () => 'Closed',
} as const

const PRIVILEGE_ACTION: Record<string, string> = {
  awaiting: 'Review and sign',
  active: 'Open record',
  due: 'Start review',
  lapsed: 'Re-sign',
  steppedDown: 'Review evidence',
}

/** An agent's privileges as Privilege cards (component 04). */
export function selectPrivilegeCards(s: DemoState, agentId: string): PrivilegeCardView[] {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent) return []
  return s.privileges
    .filter((p) => p.agentId === agentId)
    .map((p) => {
      const act = s.activities.find((a) => a.id === p.activityId)
      const level = p.state === 'awaiting' ? 'shadow' : p.level
      const ladder: LadderState[] = LADDER[level].map((st, i) =>
        p.proposedLevel && ['shadow', 'draft', 'supervised', 'autonomous'][i] === p.proposedLevel ? 'proposed' : st,
      )
      return {
        state: p.state,
        statusLabel: PRIVILEGE_STATUS[p.state](s, p.reviewDate, p.movedBy),
        code: `${p.code} v${p.version}`,
        title: act?.name ?? '',
        scope: `${agent.name} · ${p.domain}`,
        ladder,
        ladderCaption: p.proposedLevel ? `${LEVEL_NAME[level]} now · ${LEVEL_NAME[p.proposedLevel]} proposed` : `${LEVEL_NAME[p.level]}${p.grantedAt ? ` since ${formatDate(p.grantedAt)}` : ''}`,
        rows: [
          { key: 'Granted by', value: p.grantedBy ? `${personName(s, p.grantedBy)}${p.grantedAt ? ` · ${formatDate(p.grantedAt)}` : ''}` : 'Awaiting signature' },
          { key: 'Evidence', value: p.evidence },
          { key: 'Conditions', value: p.conditions.length ? p.conditions.join(' · ') : 'None' },
          { key: 'Review', value: p.reviewDate ? `${formatDate(p.reviewDate)} · ${formatRelative(p.reviewDate, s.now).replace('Overdue', 'overdue')}` : '—' },
        ],
        footnote:
          p.state === 'due'
            ? 'Lapses to Shadow if not re-signed'
            : p.state === 'active'
              ? `${p.stepDownTriggers.length} step-down ${p.stepDownTriggers.length === 1 ? 'trigger' : 'triggers'} armed`
              : p.state === 'steppedDown'
                ? 'Back to Draft needs a signature again'
                : '',
        actionLabel: PRIVILEGE_ACTION[p.state]!,
      }
    })
}

/** What happened to this agent: logged changes (audit) and routine events, newest first. */
export function selectAgentHistory(s: DemoState, agentId: string) {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent) return []
  const codes = new Set([agent.code, agent.name, ...s.exceptions.filter((e) => e.agentId === agentId).map((e) => e.code)])
  const audit = s.audit
    .filter((a) => codes.has(a.target))
    .map((a) => ({ id: a.id, at: a.at, text: `${a.action} ${a.target}`, sub: `${personName(s, a.who)}${a.reason ? ` · ${a.reason}` : ''}` }))
  const log = s.logEvents.filter((e) => e.agentId === agentId).map((e) => ({ id: e.id, at: e.at, text: e.text, sub: e.sub ?? '' }))
  return [...audit, ...log].sort((a, b) => b.at.localeCompare(a.at)).map((e) => ({ ...e, time: formatClock(e.at) }))
}

/** The wall display (4e): attention divisions with up to three items by deadline, the rest quiet. */
export function selectWall(s: DemoState) {
  const divisions = selectDivisionSummaries(s)
  const overflow: string[] = []
  const attention = divisions
    .filter((d) => d.needsHuman > 0)
    .map((d) => {
      const items = s.exceptions
        .filter((e) => isOpen(e) && ATTENTION.includes(e.status) && s.agents.find((a) => a.id === e.agentId)?.divisionId === d.id)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .map((e) => {
          const agent = s.agents.find((a) => a.id === e.agentId)!
          return { id: e.id, status: e.status, name: agent.name.replace(/ Agent$/, ''), fullName: agent.name, reason: e.wallShort ?? e.short ?? e.reason, age: formatAge(e.raisedAt, s.now) }
        })
      for (const extra of items.slice(3)) overflow.push(`+1 more in ${d.name}: ${extra.fullName} ${extra.reason}`)
      const page = s.divisions.find((x) => x.id === d.id)?.page
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        chip: d.status === 'crit' ? 'Critical' : `${d.needsHuman} need a human`,
        sub: page?.ackAt ? `${d.owner} · acknowledged ${formatClock(page.ackAt)}` : d.nextDeadline ? `${d.owner} · next deadline ${d.nextDeadline.at}` : d.owner,
        items: items.slice(0, 3),
      }
    })
  const pausesThisHour = s.audit.filter((a) => a.action === 'Paused' && minutesBetween(a.at, s.now) <= 60).length
  const { lastHour } = s.stats24h
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return {
    title: `${attention.length} ${attention.length === 1 ? 'division needs' : 'divisions need'} a human`,
    clock: formatClock(s.now),
    date: `${formatDay(s.now)} · live, every 30 s`,
    attention,
    quiet: divisions
      .filter((d) => d.needsHuman === 0)
      .map((d) => ({ id: d.id, name: d.name, sub: `${d.owner} · ${d.agentCount} agents`, note: d.status === 'shadow' ? 'Shadow' : 'No exceptions' })),
    lastHour: `${plural(lastHour.hardStops, 'hard stop')} fired · ${plural(lastHour.pauses + pausesThisHour, 'pause')} · ${plural(lastHour.pages, 'page')}`,
    overflow,
  }
}

