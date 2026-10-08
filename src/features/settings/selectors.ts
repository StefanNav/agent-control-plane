import { TIER_RULES } from '../../data/seed/catalogue'
import type { DemoState, Division, LapsePolicy } from '../../data/types'
import { addDays, formatDate, minutesBetween } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { can } from '../../store/permissions'
import { diffDivision, type DivisionPatch } from '../../store/settings'
import { onBoard } from '../board/selectors'
import { SPAN_GUIDELINE } from '../onboarding/selectors'

const LEVEL: Record<string, string> = { shadow: 'Shadow', draft: 'Draft', supervised: 'Supervised', autonomous: 'Autonomous' }

/** The four lapse policies, as 8a words them. */
export const LAPSE_OPTIONS: { value: LapsePolicy; title: string; description: string }[] = [
  { value: 'nothing', title: 'Raise an exception only', description: 'The activity keeps its level until someone acts' },
  { value: 'shadow', title: 'Raise an exception, then back to Shadow', description: 'After a grace period, drafts stop reaching clinicians' },
  { value: 'shadowNow', title: 'Back to Shadow at once', description: 'No grace period' },
  { value: 'pause', title: 'Pause the activity', description: 'Pending work goes to people, like a pause' },
]

export const GRACE_OPTIONS = [7, 14, 30].map((d) => ({ value: String(d), label: `${d} days` }))

/** Everyone holding at least one role: the "People and roles · N" count. */
export const peopleWithRoles = (s: DemoState) => s.people.filter((p) => s.roles.some((r) => r.personId === p.id))

/** Agents on the boards in a division. */
const agentsIn = (s: DemoState, divisionId: string) => s.agents.filter((a) => onBoard(a) && a.divisionId === divisionId)

/** Activities a person directly supervises: every activity of the agents they own. */
export function spanOf(s: DemoState, personId: string, extraAgentIds: string[] = []) {
  const owned = s.agents.filter((a) => onBoard(a) && (a.ownerId === personId || extraAgentIds.includes(a.id)))
  return owned.reduce((n, a) => n + s.activities.filter((x) => x.agentId === a.id).length, 0)
}

const ROLE_WORD: Record<string, string> = { sponsor: 'clinical sponsor', owner: 'agent owner', programLead: 'program lead' }

/** What the chosen policy does to the division's most overdue privilege, in one sentence (8a). */
function lapsePreview(s: DemoState, d: Division, policy: LapsePolicy, graceDays: number): string {
  const ids = new Set(s.agents.filter((a) => a.divisionId === d.id).map((a) => a.id))
  const mine = s.privileges.filter((p) => ids.has(p.agentId))
  const agentName = (id: string) => s.agents.find((a) => a.id === id)?.name ?? ''
  const overdue = mine
    .filter((p) => p.state === 'due' && p.level !== 'shadow' && p.reviewDate && p.reviewDate < s.now)
    .sort((a, b) => a.reviewDate!.localeCompare(b.reviewDate!))[0]
  if (overdue) {
    const days = Math.floor(minutesBetween(overdue.reviewDate!, s.now) / (24 * 60))
    const at = addDays(overdue.reviewDate!, graceDays)
    const effect =
      policy === 'nothing'
        ? 'it keeps its level until someone acts'
        : policy === 'pause'
          ? 'its activity is paused when you save'
          : policy === 'shadowNow' || at <= s.now
            ? 'it returns to Shadow when you save'
            : `it returns to Shadow on ${formatDate(at)}`
    return `${agentName(overdue.agentId)} is ${days} ${days === 1 ? 'day' : 'days'} past its review date. With this setting ${effect}.`
  }
  const lapsed = mine.find((p) => p.state === 'lapsed')
  if (lapsed) return `${agentName(lapsed.agentId)} is at Shadow until ${personName(s, d.sponsorId)} re-signs it.`
  const next = mine
    .filter((p) => (p.state === 'active' || p.state === 'due') && p.level !== 'shadow' && p.reviewDate && p.reviewDate >= s.now)
    .sort((a, b) => a.reviewDate!.localeCompare(b.reviewDate!))[0]
  return `No privilege in ${d.name} is past its review date.${next ? ` Next: ${agentName(next.agentId)} on ${formatDate(next.reviewDate!)}.` : ''}`
}

/** 8a: who answers for a division, what a lapsed review does, who unanswered items reach. */
export function selectDivisionSettings(s: DemoState, divisionId: string, draft: DivisionPatch, viewerId: string) {
  const d = s.divisions.find((x) => x.id === divisionId)
  if (!d) return null
  const value = { ownerId: d.ownerId, sponsorId: d.sponsorId, lapsePolicy: d.lapsePolicy, graceDays: d.graceDays, escalation: d.escalation, ...draft }
  const agents = agentsIn(s, d.id)
  const atDraft = s.activities.filter((a) => a.level === 'draft' && agents.some((x) => x.id === a.agentId)).length
  const holders = (role: 'owner' | 'sponsor') => [...new Set(s.roles.filter((r) => r.role === role).map((r) => r.personId))]
  const options = (ids: string[], current: string) =>
    [...new Set([current, ...ids])].sort((a, b) => personName(s, a).localeCompare(personName(s, b))).map((id) => ({ value: id, label: personName(s, id) }))
  // The new owner takes over the agents the old one owned here (R5).
  const moving = value.ownerId === d.ownerId ? [] : agents.filter((a) => a.ownerId === d.ownerId).map((a) => a.id)
  const span = spanOf(s, value.ownerId, moving)
  const lead = s.roles.filter((r) => r.role === 'programLead').map((r) => r.personId)
  const chainIds = [...new Set([value.sponsorId, value.ownerId, ...lead])]
  const chainOptions = (current: string) =>
    [...new Set([...chainIds, current])].map((id) => {
      const role = id === value.sponsorId ? 'sponsor' : id === value.ownerId ? 'owner' : lead.includes(id) ? 'programLead' : ''
      return { value: id, label: `${personName(s, id)}${role ? ` · ${ROLE_WORD[role]}` : ''}` }
    })
  const changes = diffDivision(d, draft).length
  const rows = [d, ...s.divisions.filter((x) => x.id !== d.id).sort((a, b) => a.name.localeCompare(b.name))].map((x) => ({
    id: x.id,
    name: x.name,
    sub: `${personName(s, x.ownerId)} · ${agentsIn(s, x.id).length} agents`,
    current: x.id === d.id,
  }))
  return {
    id: d.id,
    breadcrumb: `Settings / Divisions / ${d.name}`,
    title: d.name,
    sub: `Division · ${agents.length} agents · ${atDraft} ${atDraft === 1 ? 'activity' : 'activities'} at Draft`,
    tabs: [
      { id: 'settings', label: 'Settings', to: `/settings/divisions/${d.id}` },
      { id: 'people', label: `People and roles · ${peopleWithRoles(s).length}`, to: '/settings/people' },
      { id: 'agents', label: `Agents · ${agents.length}`, to: `/settings/divisions/${d.id}?tab=agents` },
    ],
    divisions: { head: `DIVISIONS · ${s.divisions.length}`, rows },
    owner: { value: value.ownerId, name: personName(s, value.ownerId), options: options(holders('owner'), d.ownerId) },
    sponsor: { value: value.sponsorId, name: personName(s, value.sponsorId), options: options(holders('sponsor'), d.sponsorId) },
    span:
      span > SPAN_GUIDELINE
        ? { lead: `${personName(s, value.ownerId)} directly supervises ${span} activities.`, text: `The guideline is ${SPAN_GUIDELINE}. Splitting ${d.name} in two keeps each owner within span.` }
        : null,
    lapse: {
      value: value.lapsePolicy,
      label: LAPSE_OPTIONS.find((o) => o.value === value.lapsePolicy)!.title,
      graceDays: value.graceDays,
      preview: lapsePreview(s, d, value.lapsePolicy, value.graceDays),
    },
    escalation: {
      first: value.escalation.first,
      then: value.escalation.then,
      firstLabel: chainOptions(value.escalation.first).find((o) => o.value === value.escalation.first)!.label,
      thenLabel: chainOptions(value.escalation.then).find((o) => o.value === value.escalation.then)!.label,
      firstOptions: chainOptions(value.escalation.first),
      thenOptions: chainOptions(value.escalation.then),
      thenHelp: `If still unanswered after ${value.escalation.afterHours} h`,
    },
    footer: {
      changes,
      line: changes ? `${changes} ${changes === 1 ? 'change' : 'changes'} · logged as ${personName(s, viewerId)} · ${personName(s, value.sponsorId)} told` : 'No changes',
    },
    editable: can(s, viewerId, 'manageDivisions', { divisionId: d.id }),
  }
}

/** The division's agents, read only (8a's "Agents" tab, composed). */
export function selectDivisionAgents(s: DemoState, divisionId: string) {
  return agentsIn(s, divisionId).map((a) => ({
    id: a.id,
    name: a.name,
    level: LEVEL[a.level] ?? a.level,
    owner: personName(s, a.ownerId),
    techOwner: personName(s, a.techOwnerId),
    tier: `Tier ${a.riskTier} · ${TIER_RULES[a.riskTier].label}`,
  }))
}
