import type { DemoState, Division, Privilege, Role } from '../data/types'
import { addDays, addMinutes, formatDate } from '../lib/clock'
import { applyPause, nextVersion } from './mutations'
import { personName } from './onboardingRules'

/** The rule that acts when a review date passes, as it appears on records (8a, component sheet). */
export const LAPSE_RULE = 'ORG-LAPSE-01'

const LEVELS: Array<'shadow' | 'draft' | 'supervised' | 'autonomous'> = ['shadow', 'draft', 'supervised', 'autonomous']

/** An agent's level is its highest activity's level. */
function relevel(s: DemoState, agentId: string) {
  const agent = s.agents.find((a) => a.id === agentId)
  if (!agent) return
  const levels = s.activities.filter((a) => a.agentId === agentId).map((a) => LEVELS.indexOf(a.level))
  agent.level = LEVELS[Math.max(0, ...levels)]!
}

/**
 * One activity back to Shadow (6c): its privilege closes and a new version waits for the sponsor
 * to sign the way back. `by` is a person, or a rule.
 */
export function applyReturnToShadow(s: DemoState, activityId: string, by: string, reason: string): DemoState {
  const target = s.activities.find((a) => a.id === activityId)
  if (!target) return s
  const was = target.level
  target.level = 'shadow'
  relevel(s, target.agentId)
  const current = s.privileges.find((p) => p.activityId === activityId && p.state !== 'closed')
  if (!current) return s
  current.state = 'closed'
  const version = nextVersion(s, current.code)
  s.privileges.push({
    ...current,
    id: `${current.code.toLowerCase()}-v${version}`,
    version,
    level: 'shadow',
    proposedLevel: was,
    state: 'awaiting',
    grantedBy: undefined,
    grantedAt: undefined,
    movedBy: by,
    trigger: reason,
  })
  return s
}

const divisionOf = (s: DemoState, agentId: string) =>
  s.divisions.find((d) => d.id === s.agents.find((a) => a.id === agentId)?.divisionId)

/** When the division's lapse policy acts on this privilege, or null if it never does (8a). */
export function lapseDate(s: DemoState, p: Privilege): string | null {
  const division = divisionOf(s, p.agentId)
  if (!division || !p.reviewDate || division.lapsePolicy === 'nothing') return null
  return division.lapsePolicy === 'shadow' ? addDays(p.reviewDate, division.graceDays) : p.reviewDate
}

/**
 * Apply each division's lapse policy to its overdue privileges (8a, R4). Back to Shadow marks the
 * privilege lapsed (it is re-signed, not re-proposed); a pause stops the activity like 6b. Idempotent.
 */
export function applyLapses(s: DemoState): DemoState {
  for (const p of s.privileges) {
    if (p.state !== 'due' || p.level === 'shadow') continue
    const agent = s.agents.find((a) => a.id === p.agentId)
    const activity = s.activities.find((a) => a.id === p.activityId)
    if (!agent || !activity || agent.lifecycle === 'retired') continue
    const when = lapseDate(s, p)
    if (!when || when > s.now) continue
    const why = `Review date passed ${formatDate(p.reviewDate!)}`
    if (divisionOf(s, p.agentId)!.lapsePolicy === 'pause') {
      if (activity.paused || agent.lifecycle === 'paused') continue
      applyPause(s, [agent.id], { scope: 'activity', activityId: activity.id, reason: `${why} · ${LAPSE_RULE}` }, LAPSE_RULE, s.now)
      continue
    }
    Object.assign(p, { state: 'lapsed', movedBy: LAPSE_RULE, trigger: why })
    activity.level = 'shadow'
    relevel(s, agent.id)
    s.logEvents.push({ id: `log-lapse-${s.logEvents.length + 1}`, at: s.now, agentId: agent.id, text: `${activity.name} returned to Shadow`, sub: `${LAPSE_RULE} · ${why.toLowerCase()}` })
  }
  return s
}

export type DivisionPatch = Partial<Pick<Division, 'ownerId' | 'sponsorId' | 'lapsePolicy' | 'graceDays' | 'escalation'>>

/** What a patch changes, in words for the audit and the footer (8a "1 change"). */
export function diffDivision(d: Division, patch: DivisionPatch): string[] {
  const changes: string[] = []
  if (patch.ownerId !== undefined && patch.ownerId !== d.ownerId) changes.push('division owner')
  if (patch.sponsorId !== undefined && patch.sponsorId !== d.sponsorId) changes.push('clinical sponsor')
  if (patch.lapsePolicy !== undefined && patch.lapsePolicy !== d.lapsePolicy) changes.push('what happens when a review date passes')
  if (patch.graceDays !== undefined && patch.graceDays !== d.graceDays) changes.push('grace period')
  const e = patch.escalation
  if (e && (e.first !== d.escalation.first || e.then !== d.escalation.then || e.afterHours !== d.escalation.afterHours)) changes.push('who unanswered exceptions reach')
  return changes
}

/** Move one division role from one person to another, with everything that follows it (R5). */
function handOver(s: DemoState, d: Division, role: Extract<Role, 'owner' | 'sponsor'>, from: string, to: string, at: string) {
  s.roles = s.roles.filter((r) => !(r.personId === from && r.divisionId === d.id && r.role === role))
  if (!s.roles.some((r) => r.personId === to && r.divisionId === d.id && r.role === role)) s.roles.push({ personId: to, divisionId: d.id, role, since: at })
  const field = role === 'owner' ? 'ownerId' : 'sponsorId'
  const agentIds = new Set(s.agents.filter((a) => a.divisionId === d.id).map((a) => a.id))
  for (const agent of s.agents) if (agentIds.has(agent.id) && agent[field] === from) agent[field] = to
  for (const e of s.exceptions) {
    if (!agentIds.has(e.agentId) || e.ownerId !== from || e.state === 'resolved' || e.state === 'dismissed') continue
    e.ownerId = to
    e.copied = [...e.copied.filter((p) => p !== to), ...(e.copied.includes(from) ? [] : [from])]
  }
  if (d.resumeNeeds) d.resumeNeeds = d.resumeNeeds.map((n) => (n === personName(s, from) ? personName(s, to) : n))
  if (role === 'sponsor') {
    if (d.escalation.first === from) d.escalation.first = to
    if (d.escalation.then === from) d.escalation.then = to
  }
  d[field] = to
}

/**
 * Dana saves a division's settings (8a): who answers for it, what a lapsed review does, who
 * unanswered items reach. The sponsor (old and new) is told, and the lapse policy acts at once.
 */
export function applyDivisionSettings(s: DemoState, divisionId: string, patch: DivisionPatch, by: string, at: string): DemoState {
  const d = s.divisions.find((x) => x.id === divisionId)
  if (!d) return s
  const changes = diffDivision(d, patch)
  if (!changes.length) return s
  const oldSponsor = d.sponsorId
  if (patch.ownerId && patch.ownerId !== d.ownerId) handOver(s, d, 'owner', d.ownerId, patch.ownerId, at)
  if (patch.sponsorId && patch.sponsorId !== d.sponsorId) handOver(s, d, 'sponsor', d.sponsorId, patch.sponsorId, at)
  if (patch.lapsePolicy) d.lapsePolicy = patch.lapsePolicy
  if (patch.graceDays) d.graceDays = patch.graceDays
  if (patch.escalation) d.escalation = { ...patch.escalation }
  s.logEvents.push({
    id: `log-settings-${s.logEvents.length + 1}`,
    at,
    text: `${personName(s, by)} changed ${d.name} settings`,
    sub: changes.join(' · '),
    to: [d.sponsorId, ...(oldSponsor !== d.sponsorId ? [oldSponsor] : [])],
  })
  return applyLapses(s)
}

export interface NewDivisionInput {
  name: string
  ownerId: string
  sponsorId: string
  /** For a split: the agents that move from the parent division. */
  agentIds: string[]
}

/** A division's id from its name: "Medications · surgical" → "medications-surgical". */
export const divisionSlug = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function grant(s: DemoState, personId: string, divisionId: string, role: Role, at: string) {
  if (!s.roles.some((r) => r.personId === personId && r.divisionId === divisionId && r.role === role)) s.roles.push({ personId, divisionId, role, since: at })
}

/**
 * A new division, or a split of `from` (R6, 8a "New division" / "Split this division"): it takes the
 * parent's lapse policy, an escalation chain of {sponsor, program lead, 4 h}, and roles for the people
 * who answer for it. Moved agents change owner, and their open items follow.
 */
export function applyCreateDivision(s: DemoState, input: NewDivisionInput, from: string | null, by: string, at: string): DemoState {
  const parent = s.divisions.find((d) => d.id === from) ?? s.divisions.find((d) => d.id === 'medications')!
  const id = divisionSlug(input.name)
  const lead = s.roles.find((r) => r.role === 'programLead')?.personId ?? by
  s.divisions.push({
    id,
    name: input.name.trim(),
    ownerId: input.ownerId,
    sponsorId: input.sponsorId,
    lapsePolicy: parent.lapsePolicy,
    graceDays: parent.graceDays,
    escalation: { first: input.sponsorId, then: lead, afterHours: 4 },
    monitor: { state: 'live', lastAt: addMinutes(at, -1) },
    exceptionsByDay: [0, 0, 0, 0, 0, 0, 0],
    resumeNeeds: [personName(s, input.ownerId), personName(s, input.sponsorId)],
  })
  grant(s, input.ownerId, id, 'owner', at)
  grant(s, input.sponsorId, id, 'sponsor', at)
  const moved = s.agents.filter((a) => input.agentIds.includes(a.id))
  for (const techOwner of new Set(moved.map((a) => a.techOwnerId))) grant(s, techOwner, id, 'techOwner', at)
  if (from) for (const r of s.roles.filter((x) => x.divisionId === from && x.role === 'frontline')) grant(s, r.personId, id, 'frontline', at)
  for (const agent of moved) {
    const oldOwner = agent.ownerId
    Object.assign(agent, { divisionId: id, ownerId: input.ownerId, sponsorId: input.sponsorId })
    for (const e of s.exceptions) {
      if (e.agentId !== agent.id || e.ownerId !== oldOwner || e.state === 'resolved' || e.state === 'dismissed') continue
      e.ownerId = input.ownerId
      e.copied = [...e.copied.filter((p) => p !== input.ownerId), ...(e.copied.includes(oldOwner) ? [] : [oldOwner])]
    }
  }
  s.logEvents.push({
    id: `log-division-${s.logEvents.length + 1}`,
    at,
    text: `${personName(s, by)} created ${input.name.trim()}`,
    sub: from ? `Split from ${parent.name} · ${moved.length} ${moved.length === 1 ? 'agent' : 'agents'}` : 'New division',
    to: [input.sponsorId, input.ownerId],
  })
  return s
}
