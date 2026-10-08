import type { DemoState, Domain } from '../../data/types'
import { formatDate } from '../../lib/clock'
import { onboardingContext, personName } from '../../store/onboardingRules'
import { onBoard } from '../board/selectors'

/** The span-of-control guideline: past this many directly supervised activities, exceptions wait (2a). */
export const SPAN_GUIDELINE = 7

const divisionName = (s: DemoState, id: string | undefined) => s.divisions.find((d) => d.id === id)?.name ?? ''
const titleOf = (s: DemoState, id: string) => s.people.find((p) => p.id === id)?.title.toLowerCase() ?? ''

/** "7 West, 8 East · adults 18+ · all hours" */
export const domainLine = (d: Domain) => `${d.units.join(', ')} · ${d.patients.toLowerCase()} · ${d.hours.toLowerCase()}`

/** How many activities a person would directly supervise if they owned this agent (2a side card). */
export function selectSpan(s: DemoState, ownerId: string, agentId: string) {
  const { record, intake, template, agent } = onboardingContext(s, agentId)
  const activities = (id: string) => s.activities.filter((a) => a.agentId === id).length
  // Stable sort keeps seed order among equals.
  const owned = s.agents
    .filter((a) => onBoard(a) && a.ownerId === ownerId && a.id !== agentId)
    .map((a) => ({ name: a.name, activities: activities(a.id) }))
    .sort((a, b) => b.activities - a.activities)
  const added = record?.job.activities.length || template.expectedActivities
  const total = owned.reduce((n, r) => n + r.activities, 0) + added
  const rest = owned.slice(5)
  return {
    name: personName(s, ownerId),
    total,
    guideline: SPAN_GUIDELINE,
    over: total > SPAN_GUIDELINE,
    rows: [...owned.slice(0, 5), { name: `${intake?.agentName ?? agent?.name ?? ''} · new`, activities: added }],
    more: rest.length ? { agents: rest.length, activities: rest.reduce((n, r) => n + r.activities, 0) } : undefined,
  }
}

/** Step 1 (1a, 2a): what carries over from the intake, who can be named, and what starting does. */
export function selectIntakeStep(s: DemoState, agentId: string) {
  const { intake, people } = onboardingContext(s, agentId)
  if (!intake) return null
  const role = (personId: string) => {
    if (personId === intake.sponsorId) return 'clinical sponsor'
    const held = s.roles.find((r) => r.personId === personId && (r.divisionId === intake.divisionId || r.divisionId === 'all'))?.role
    return held === 'owner' ? 'agent owner' : held === 'programLead' ? 'AI program lead' : titleOf(s, personId)
  }
  const division = s.divisions.find((d) => d.id === intake.divisionId)

  /** People holding a role, the intake's division first, then by name (2a), each with their home division and load. */
  const candidates = (roleName: 'owner' | 'techOwner', load: (id: string) => number, verb: string) => {
    const homes = new Map<string, string>()
    for (const r of s.roles) if (r.role === roleName && !homes.has(r.personId)) homes.set(r.personId, r.divisionId)
    return [...homes.entries()]
      .sort(([a, homeA], [b, homeB]) => Number(homeB === intake.divisionId) - Number(homeA === intake.divisionId) || personName(s, a).localeCompare(personName(s, b)))
      .map(([id, home]) => ({ id, label: `${personName(s, id)} · ${titleOf(s, id)}`, sub: `${divisionName(s, home)} · ${verb} ${load(id)} agents` }))
  }
  const live = s.agents.filter(onBoard)
  return {
    intake,
    code: intake.code,
    carried: [
      ['Name', intake.agentName],
      ['Division', division?.name ?? ''],
      ['Requested by', `${personName(s, intake.requestedBy)} · ${role(intake.requestedBy)}`],
      ['Purpose', intake.purpose],
      ['Rollout domain', domainLine(intake.domain)],
      ...(intake.condition ? [['Committee condition', intake.condition.text]] : []),
    ] as [string, string][],
    conditionDate: intake.condition ? formatDate(intake.condition.at) : undefined,
    approved: formatDate(intake.approvedAt),
    division: division?.name ?? '',
    sponsor: { id: intake.sponsorId, label: `${personName(s, intake.sponsorId)} · ${s.people.find((p) => p.id === intake.sponsorId)?.title ?? ''}`, from: intake.code },
    lead: people.lead,
    defaultOwner: division?.ownerId ?? '',
    owners: candidates('owner', (id) => live.filter((a) => a.ownerId === id).length, 'owner of'),
    techOwners: candidates('techOwner', (id) => live.filter((a) => a.techOwnerId === id).length, 'technical owner on'),
    /** "What starting does" (1a), with the chosen names. */
    starting: (ownerId: string, techOwnerId: string) => [
      `Creates ${intake.agentCode} as a draft in Inventory → Drafts`,
      `Fills name, division, requester, purpose and domain from ${intake.code}`,
      `Asks ${personName(s, ownerId) || 'the agent owner'} for the job description, systems and verbs`,
      `Asks ${personName(s, techOwnerId) || 'the technical owner'} for tools and hard stops`,
      `Tells ${personName(s, intake.sponsorId)} when 2 to 4 are done`,
    ],
  }
}

/** "v0.4", or "v1.0" once the sponsor has signed. */
export const versionLabel = (version: number, frozen: boolean) => (frozen ? 'v1.0' : `v0.${version}`)

/** The record header (1a–1h): title, status, IDs, people, review chip and autosave. */
export function selectOnboardingHeader(s: DemoState, agentId: string) {
  const { record, intake, agent, people } = onboardingContext(s, agentId)
  if (!intake && !record) return null
  const division = divisionName(s, agent?.divisionId ?? intake?.divisionId)
  const name = agent?.name ?? intake?.agentName ?? ''
  if (!record || !agent) {
    return {
      breadcrumb: `Inventory / Intake / ${intake!.code}`,
      title: name,
      status: 'Intake approved · not started',
      idLine: `${intake!.code} · approved ${formatDate(intake!.approvedAt)}`,
      chip: null as string | null,
      people: [
        { role: 'Requested by', name: personName(s, intake!.requestedBy) },
        { role: 'Program lead', name: personName(s, people.lead) },
        { role: 'Division', name: division },
      ],
      saved: null as string | null,
    }
  }
  const frozen = Boolean(record.frozenAt)
  const review = record.sponsor.state
  const status = frozen ? 'In review' : review === 'waiting' ? 'Onboarding · waiting for sponsor' : review === 'returned' ? 'Onboarding · returned' : 'Onboarding · draft'
  const decided = Boolean(record.review?.decision)
  return {
    breadcrumb: `Inventory / Agents / ${name}`,
    title: name,
    status,
    idLine: frozen ? `${agent.code} · v1.0 · frozen` : `${agent.code} · ${versionLabel(record.version, false)}${intake ? ` · from ${intake.code}` : ''}`,
    chip: review === 'waiting' ? 'Review: final set' : frozen && !decided ? 'Review: AIMS committee' : null,
    people: [
      { role: 'Program lead', name: personName(s, people.lead) },
      { role: 'Owner', name: personName(s, agent.ownerId) },
      { role: 'Technical owner', name: personName(s, agent.techOwnerId) },
      { role: 'Sponsor', name: personName(s, agent.sponsorId) },
      { role: 'Division', name: division },
    ],
    saved: frozen ? null : record.savedAt,
  }
}
