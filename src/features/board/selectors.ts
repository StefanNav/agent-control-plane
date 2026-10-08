import type { AgentRowView, LadderState } from '../../components'
import type { Agent, AgentException, DemoState, Level, Status } from '../../data/types'
import { formatAge, formatAgo, formatClock, formatClockSeconds, formatDate, minutesBetween } from '../../lib/clock'
import { trendPoints } from '../../lib/trend'

/** Statuses that need a human. */
export const ATTENTION: Status[] = ['crit', 'warn', 'review', 'stale']

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
  trend: number[]
  attention: { agentId: string; name: string; status: Status; reason: string; age: string }[]
  nextDeadline?: { at: string; to: string }
  agentStatuses: Status[]
}

/** One row per division for the hospital board (4a, 4d, 4e), needing-a-human first. */
export function selectDivisionSummaries(s: DemoState): DivisionSummary[] {
  const summaries = s.divisions.map((d, i): DivisionSummary => {
    const agents = s.agents.filter((a) => a.divisionId === d.id)
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
      trend: trendPoints(i, d.trend),
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
  const withdrawn = a.judgment.status === 'stale'
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
    .filter((a) => a.divisionId === divisionId)
    .map((a, i) => ({ row: agentRow(s, a, i), i }))
    .sort((a, b) => severityRank(a.row.status) - severityRank(b.row.status) || a.i - b.i)
    .map(({ row }) => row)
}

function activitiesOf(s: DemoState, agentId: string) {
  return s.activities
    .filter((act) => act.agentId === agentId)
    .map((act) => {
      const prv = s.privileges.find((p) => p.activityId === act.id)
      return {
        id: act.id,
        name: act.name,
        level: LEVEL_NAME[act.level],
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
  const withdrawn = a.judgment.status === 'stale'
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
  return {
    id: a.id,
    name: a.name,
    division: division?.name ?? '',
    divisionId: a.divisionId,
    levelLine: `${LEVEL_NAME[a.level]}${mainPrivilege?.grantedAt ? ` · since ${formatDate(mainPrivilege.grantedAt)}` : ''}`,
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
    recent: s.actions
      .filter((x) => x.agentId === a.id)
      .map((x) => ({
        id: x.id,
        code: x.code,
        at: formatClock(x.at),
        title: x.title,
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
