import type { ActionTraceView } from '../../components'
import type { AgentAction, DemoState } from '../../data/types'
import { formatAgo, formatClock, formatClockSeconds, formatDate, formatMs } from '../../lib/clock'
import { personName, shortName } from '../board/selectors'

export interface ActionFilters {
  agentId?: string
  policy?: 'any' | 'blocked' | 'passed'
  /** A reviewer outcome to match, e.g. "Edited" or "Signed as is". */
  reviewer?: string
}

export interface ActionRow {
  id: string
  code: string
  time: string
  what: string
  version: string
  actingFor: string
  /** The rule that blocked part of it, shown as a tag before the policy line. */
  rule: string | null
  policy: string
  reviewer: string
}

/** Policy checks on an action: as recorded with it, else the agent's hard stops plus its privilege condition (C1), if any. */
function checksFor(s: DemoState, a: AgentAction): number {
  if (a.context) return a.context.checks
  const stops = s.hardStops.filter((h) => h.agentId === a.agentId).length
  const conditions = s.privileges.some((p) => p.agentId === a.agentId && p.state !== 'closed' && p.conditions.length) ? 1 : 0
  return stops + conditions
}

function row(s: DemoState, a: AgentAction): ActionRow {
  const checks = checksFor(s, a)
  return {
    id: a.id,
    code: a.code,
    time: formatClockSeconds(a.at),
    what: a.title.replace('encounter ', 'enc '),
    version: `${a.agentVersion} · SOP ${a.sop}`,
    actingFor: shortName(a.actingFor),
    rule: a.blockedBy ?? null,
    policy: a.blockedBy ? `blocked · ${Math.max(0, checks - 1)} passed` : `${checks} passed`,
    reviewer: a.reviewerOutcome,
  }
}

/** The action list (7a): read only, filtered by agent, policy result and reviewer outcome. */
export function selectActions(s: DemoState, filters: ActionFilters) {
  const { agentId, policy = 'any', reviewer } = filters
  const rows = s.actions
    .filter((a) => !agentId || a.agentId === agentId)
    .filter((a) => policy === 'any' || (policy === 'blocked' ? Boolean(a.blockedBy) : !a.blockedBy))
    .filter((a) => !reviewer || a.reviewerOutcome.startsWith(reviewer))
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((a) => row(s, a))
  const total = s.stats24h.actionsToday.toLocaleString('en-US')
  const filtered = Boolean(agentId) || policy !== 'any' || Boolean(reviewer)
  return { rows, summary: filtered ? `${rows.length} of ${total} actions today` : `Latest ${rows.length} of ${total} actions today` }
}

/** One action, start to finish (7b), with who and what, policy decisions and links. Null when unknown. */
export function selectTrace(s: DemoState, actionId: string) {
  const a = s.actions.find((x) => x.id === actionId)
  if (!a) return null
  const agent = s.agents.find((x) => x.id === a.agentId)
  const privilege = s.privileges.find((p) => p.agentId === a.agentId && p.state !== 'closed' && p.level !== 'shadow')
  const actingFor = a.actingFor.split(' · ')[0] ?? a.actingFor
  const view: ActionTraceView = {
    title: a.title,
    code: a.code,
    agent: agent?.name ?? '',
    version: a.agentVersion,
    sop: a.sop,
    actingFor: a.actingFor,
    steps: a.steps.map((step) => ({ at: formatMs(step.at), kind: step.kind, title: step.title, ruleTag: step.ruleTag, detail: step.detail, meta: step.meta })),
  }
  const policySteps = a.steps.filter((step) => step.kind === 'policyPassed' || step.kind === 'policyBlocked')
  const rows: [string, string][] = policySteps.map((step) => [step.ruleTag ?? step.title, step.kind === 'policyBlocked' ? 'blocked' : 'passed'])
  // Conditions in force when it ran (C1: a pharmacist signs every draft); the reviewer step shows it held.
  const conditions = a.context?.conditions ?? (privilege?.conditions.length ? ['C1 · pharmacist signs'] : [])
  if (a.steps.some((step) => step.kind === 'reviewer')) for (const c of conditions) rows.push([c, 'passed'])
  const exception = s.exceptions.find((e) => e.agentId === a.agentId && a.blockedBy && e.ruleTag === a.blockedBy)
  const sameRule = a.blockedBy
    ? s.actions.filter((x) => x.id !== a.id && x.blockedBy === a.blockedBy && x.at.slice(0, 10) === a.at.slice(0, 10)).map((x) => x.code).sort()
    : []
  return {
    view,
    sub: `${agent?.name} ${a.agentVersion} · SOP ${a.sop} · acting for ${a.actingFor} · ${formatDate(a.at)}`,
    agentId: a.agentId,
    blockedBy: a.blockedBy ?? null,
    who: [
      ['Agent', `${agent?.name} ${a.agentVersion}`],
      ['SOP', `${a.sop}${a.sopHash ? ` · hash ${a.sopHash}` : ''}`],
      ['Acting for', actingFor],
      ['Privilege', a.context?.privilege ?? (privilege ? `${privilege.code} v${privilege.version} · ${privilege.level === 'draft' ? 'Draft' : privilege.level}` : '—')],
    ] as [string, string][],
    policy: rows.length ? { summary: `${rows.length} checked · ${rows.filter(([, r]) => r === 'blocked').length} blocked`, rows } : null,
    linked: {
      exception: exception ? { id: exception.id, text: `${exception.code} · ${personName(s, exception.ownerId)}` } : null,
      sameRule,
    },
    /** For "Open incident": every action blocked by the same rule today, this one included. */
    sameRuleIds: a.blockedBy ? s.actions.filter((x) => x.blockedBy === a.blockedBy && x.at.slice(0, 10) === a.at.slice(0, 10)).map((x) => x.id) : [a.id],
  }
}

const STATE_LABEL = { open: 'Investigating', corrections: 'Corrections', closed: 'Closed' } as const

/** The incident record (7c): who runs it, what happened, why, what is being fixed, and when. Null when unknown. */
export function selectIncident(s: DemoState, personaId: string, incidentId: string) {
  const inc = s.incidents.find((i) => i.id === incidentId)
  if (!inc) return null
  const agent = s.agents.find((a) => a.id === inc.agentId)
  const open = inc.corrections.filter((c) => !c.done).length
  const commander = personName(s, inc.commanderId)
  const sponsor = personName(s, agent?.sponsorId)
  const pausedAt = inc.timeline.find((t) => t.title.endsWith('paused the agent'))?.at
  const resumedAt = inc.timeline.find((t) => t.title === 'Resume approved')?.at
  const paused =
    agent?.lifecycle === 'paused' && agent.pausedAt
      ? ` The agent has been paused for ${formatAgo(agent.pausedAt, s.now).replace(/ ago$/, '')}.`
      : pausedAt && resumedAt
        ? ` The agent was paused for ${formatAgo(pausedAt, resumedAt).replace(/ ago$/, '')}.`
        : ''
  const lead = s.roles.some((r) => r.personId === personaId && r.role === 'programLead')
  return {
    id: inc.id,
    code: inc.code,
    title: inc.title,
    agentId: inc.agentId,
    state: inc.state,
    statusLine: `${STATE_LABEL[inc.state]} · opened ${formatClock(inc.openedAt)}`,
    chip:
      inc.state === 'closed'
        ? { status: 'normal' as const, label: `Closed · ${formatDate(inc.closedAt ?? s.now)}` }
        : { status: 'warn' as const, label: open ? `Open · ${open} ${open === 1 ? 'correction' : 'corrections'} left` : 'Open' },
    people: [
      { role: 'Commander', name: commander },
      { role: 'Opened by', name: personName(s, inc.openedBy) },
      { role: 'Sponsor', name: sponsor },
      { role: 'Technical', name: personName(s, agent?.techOwnerId) },
      { role: 'Harm', name: inc.harm },
    ],
    summary: `${inc.summary}${paused}`,
    linked: inc.linkedActionIds.flatMap((id) => {
      const a = s.actions.find((x) => x.id === id)
      return a ? [row(s, a)] : []
    }),
    rootCause: inc.rootCause?.text ?? null,
    rootCauseBy: inc.rootCause ? personName(s, inc.rootCause.by) : null,
    corrections: inc.corrections.map((c) => ({
      id: c.id,
      text: c.text,
      sub: c.sub ?? null,
      owner: personName(s, c.ownerId),
      status: c.status,
      done: c.done,
      canComplete: !c.done && inc.state !== 'closed' && (personaId === c.ownerId || personaId === inc.commanderId || lead),
    })),
    close:
      inc.state === 'closed'
        ? null
        : {
            lead: open ? `${open} ${open === 1 ? 'correction' : 'corrections'} open.` : 'Corrections done.',
            text: `${commander} closes the incident when it’s done; ${sponsor} is told.`,
            allowed: open === 0 && (personaId === inc.commanderId || lead),
          },
    timelineSub: resumedAt ? 'From the first block to resume' : 'From the first block',
    timeline: inc.timeline.map((t) => ({ at: formatClock(t.at), title: t.title, sub: t.sub ?? '' })),
  }
}

/** The incidents list (composed): open ones first, then by when they opened. */
export function selectIncidents(s: DemoState) {
  return [...s.incidents]
    .sort((a, b) => Number(a.state === 'closed') - Number(b.state === 'closed') || b.openedAt.localeCompare(a.openedAt))
    .map((i) => ({
      id: i.id,
      code: i.code,
      title: i.title,
      agent: s.agents.find((a) => a.id === i.agentId)?.name ?? '',
      state: STATE_LABEL[i.state],
      status: i.state === 'closed' ? ('normal' as const) : ('warn' as const),
      commander: personName(s, i.commanderId),
      opened: `${formatDate(i.openedAt)} ${formatClock(i.openedAt)}`,
      linked: String(i.linkedActionIds.length),
    }))
}

/** What 7d's packet holds for Med Rec that the prototype doesn't model yet (job descriptions, committee, action volume). */
const EXPORT_FACTS: Record<string, { jobDescriptions: string; committee: string; actions: string }> = {
  'med-rec': { jobDescriptions: '4 · v1 to v4', committee: '1 · approved with C1 to C3', actions: '2,961 · 06 Nov to 08 Dec' },
}

/** The export's contents (7d), counted from the record for the chosen agents. */
export function selectExportContents(s: DemoState, agentIds: string[]): [string, string][] {
  const ids = new Set(agentIds)
  const single = agentIds.length === 1 ? EXPORT_FACTS[agentIds[0]!] : undefined
  const privileges = s.privileges.filter((p) => ids.has(p.agentId) && p.level !== 'shadow' && p.state !== 'closed')
  const signatures = privileges.reduce((n, p) => n + Math.max(0, p.version - 1), 0)
  const stops = s.hardStops.filter((h) => ids.has(h.agentId)).length
  const exceptions = s.exceptions.filter((e) => ids.has(e.agentId)).length
  const incidents = s.incidents.filter((i) => ids.has(i.agentId))
  const codes = [...ids].flatMap((id) => s.agents.filter((a) => a.id === id).map((a) => a.code))
  // Every pause goes through applyPause, which logs the drafts it routed; resumes are audited.
  const pauses = s.logEvents.filter((e) => e.agentId && ids.has(e.agentId) && e.id.startsWith('log-pause')).length
  const resumes = s.audit.filter((a) => a.action === 'Resumed' && codes.includes(a.target)).length
  const actions = s.actions.filter((a) => ids.has(a.agentId)).length
  return [
    ['Job description versions', single?.jobDescriptions ?? '—'],
    ['Privileges and signatures', privileges.length ? `${privileges.map((p) => `${p.code} v1 to v${p.version}`).join(', ')} · ${signatures} ${signatures === 1 ? 'signature' : 'signatures'}` : 'None'],
    ['Committee decisions and conditions', single?.committee ?? '—'],
    ['Hard-stop tests', stops ? `${stops} · with examples` : 'None'],
    ['Actions and traces', single?.actions ?? `${actions} seeded`],
    ['Exceptions and how each closed', String(exceptions)],
    ['Incidents', incidents.length ? `${incidents.length} · ${incidents.map((i) => i.code).join(', ')}` : 'None'],
    ['Pauses and resumes', pauses ? `${pauses} · ${resumes >= pauses ? 'with both reasons' : 'still paused'}` : 'None'],
  ]
}
