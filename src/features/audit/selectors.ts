import type { ActionTraceView } from '../../components'
import type { AgentAction, DemoState } from '../../data/types'
import { formatClockSeconds, formatDate, formatMs } from '../../lib/clock'
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

/** Policy checks on an action: the agent's hard stops plus its privilege condition (C1), if any. */
function checksFor(s: DemoState, a: AgentAction): number {
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
  // C1 on the privilege: a pharmacist signs every draft; the reviewer step shows it held.
  if (privilege?.conditions.length && a.steps.some((step) => step.kind === 'reviewer')) rows.push(['C1 · pharmacist signs', 'passed'])
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
      ['Privilege', privilege ? `${privilege.code} v${privilege.version} · ${privilege.level === 'draft' ? 'Draft' : privilege.level}` : '—'],
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
