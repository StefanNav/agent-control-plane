import { TIER_RULES } from '../../data/seed/catalogue'
import type { DemoState, Division, LapsePolicy, Role, RoleAssignment } from '../../data/types'
import { addDays, formatDate, minutesBetween } from '../../lib/clock'
import { personName } from '../../store/onboardingRules'
import { can, type PermAction } from '../../store/permissions'
import { diffDivision, ROLE_LABEL, roleDivision, type DivisionPatch, type RoleInput } from '../../store/settings'
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

/** The "New division" / "Split <division>" modal (8a, composed): agents to move and both owners' spans. */
export function selectNewDivision(s: DemoState, from: string | null, draft: { ownerId: string; agentIds: string[] }) {
  const parent = from ? s.divisions.find((d) => d.id === from) : undefined
  const count = (id: string) => s.activities.filter((a) => a.agentId === id).length
  const agents = parent
    ? agentsIn(s, parent.id)
        .map((a) => ({ id: a.id, name: a.name, activities: count(a.id), checked: draft.agentIds.includes(a.id) }))
        .sort((a, b) => b.activities - a.activities)
    : []
  const moving = agents.filter((a) => a.checked).reduce((n, a) => n + a.activities, 0)
  const holders = (role: 'owner' | 'sponsor') =>
    [...new Set(s.roles.filter((r) => r.role === role).map((r) => r.personId))]
      .sort((a, b) => personName(s, a).localeCompare(personName(s, b)))
      .map((id) => ({ value: id, label: personName(s, id) }))
  const picked = agents.filter((a) => a.checked).length
  return {
    title: parent ? `Split ${parent.name}` : 'New division',
    agents,
    ownerOptions: holders('owner'),
    sponsorOptions: holders('sponsor'),
    defaultSponsor: parent?.sponsorId ?? '',
    line: parent
      ? `${personName(s, parent.ownerId)} keeps ${spanOf(s, parent.ownerId) - moving} activities${draft.ownerId ? ` · ${personName(s, draft.ownerId)} takes ${moving}` : ''}`
      : null,
    button: parent ? `Create division and move ${picked} ${picked === 1 ? 'agent' : 'agents'}` : 'Create division',
  }
}

const ROLE_ORDER: Role[] = ['programLead', 'committee', 'readOnly', 'sponsor', 'owner', 'techOwner', 'frontline']

/** What each role does, verbatim from 8b's CAN column. */
const CAN_SUMMARY: Record<Role, string> = {
  programLead: 'Everything, including disable and retire',
  committee: 'Committee decisions',
  readOnly: 'Read only · opens incidents',
  sponsor: 'Signs privileges · approves resume',
  owner: 'Supervises · pauses · requests resume',
  techOwner: 'Tools · hard stops · pauses',
  frontline: 'Works in Epic · no console access',
}

/** 8b's capability lines (the frame's six, then three more), each decided by `can()` (R8). */
const CAPABILITIES: { label: string; actions: PermAction[] }[] = [
  { label: 'Grant and revoke tools', actions: ['configureTools', 'revokeTool'] },
  { label: 'Write and test hard stops', actions: ['configureTools'] },
  { label: 'Pause, return an activity to Shadow', actions: ['pause', 'returnToShadow'] },
  { label: 'Sign privileges', actions: ['signPrivilege'] },
  { label: 'Approve a resume', actions: ['resume'] },
  { label: 'Disable or retire agents', actions: ['disable', 'retire'] },
  { label: 'Edit job descriptions', actions: ['editJobDescription'] },
  { label: 'Decide go-live in committee', actions: ['approveGoLive'] },
  { label: 'Manage divisions and roles', actions: ['manageDivisions'] },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 8b: everyone with a role, the selected person's roles, and what a role would let them do. */
export function selectPeople(s: DemoState, selectedId: string | null, adding: RoleInput | null, viewerId: string) {
  const divisionName = (id: string) => (id === 'all' ? 'All divisions' : (s.divisions.find((d) => d.id === id)?.name ?? id))
  const byName = [...s.divisions].sort((a, b) => a.name.localeCompare(b.name))
  /** Where an assignment sorts: hospital-wide, then Medications, then other divisions by name; frontline last. */
  const key = (r: RoleAssignment) => {
    const role = ROLE_ORDER.indexOf(r.role)
    if (r.role === 'frontline') return 10_000
    if (r.divisionId === 'all') return role
    const division = r.divisionId === 'medications' ? 0 : 1 + byName.findIndex((d) => d.id === r.divisionId)
    return 100 * (division + 1) + role
  }
  const assignments = (personId: string) => s.roles.filter((r) => r.personId === personId).sort((a, b) => key(a) - key(b))
  const rows = peopleWithRoles(s)
    .map((p) => ({ p, held: assignments(p.id) }))
    .sort((a, b) => key(a.held[0]!) - key(b.held[0]!))
    .map(({ p, held }) => ({
      id: p.id,
      name: p.name,
      role: [...new Set(held.map((r) => ROLE_LABEL[r.role]))].join(', '),
      division: held.some((r) => r.divisionId === 'all') ? 'All divisions' : [...new Set(held.map((r) => divisionName(r.divisionId)))].join(', ') || '—',
      can: CAN_SUMMARY[held[0]!.role],
    }))
  const editable = can(s, viewerId, 'manageDivisions')
  const person = s.people.find((p) => p.id === (selectedId ?? rows[0]?.id))
  const held = person ? assignments(person.id) : []
  // The role the capability list describes: the one being added, else the person's first.
  const preview: RoleInput | null = adding ?? (held[0] ? { role: held[0].role, divisionId: held[0].divisionId } : null)
  const only = preview ? { roles: [{ personId: person?.id ?? '', divisionId: roleDivision(preview), role: preview.role, since: s.now }], agents: s.agents } : null
  const since = (iso: string) => `since ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
  return {
    rows,
    count: rows.length,
    editable,
    roleOptions: ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
    divisionOptions: s.divisions.map((d) => ({ value: d.id, label: d.name })),
    person: person
      ? {
          id: person.id,
          name: person.name,
          title: person.title,
          roles: held.map((r) => ({
            role: r.role,
            divisionId: r.divisionId,
            label: `${ROLE_LABEL[r.role]} · ${divisionName(r.divisionId)}`,
            since: since(r.since),
            removable: editable,
          })),
          capsHead: preview ? `As ${ROLE_LABEL[preview.role].replace(/^[A-Z][a-z]/, (m) => m.toLowerCase())}, ${person.name} can` : '',
          caps:
            preview && only
              ? CAPABILITIES.map((c) => ({ label: c.label, ok: c.actions.every((a) => can(only, person.id, a, { divisionId: roleDivision(preview) === 'all' ? undefined : roleDivision(preview) })) }))
              : [],
        }
      : null,
  }
}
