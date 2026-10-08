import { gatewayTool, ORG_NEVER, ORG_POL_02, RETEST_CASES } from '../../data/seed/catalogue'
import type { DemoState, Domain, GrantCell, Verb } from '../../data/types'
import { formatClock, formatDate } from '../../lib/clock'
import { purposeText } from '../../store/onboarding'
import { FIELD_NAMES, firstMissingField, jobFields, limitsProgress, needsReason, onboardingContext, openStep, personName, reachLine, readyToSend, recordItems, systemsProgress, type JobFieldId } from '../../store/onboardingRules'
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

/** Step 2, the job description (1b): fields, what's missing, and the welcome back. */
export function selectJobStep(s: DemoState, agentId: string, viewer: string) {
  const { record, template, intake, people } = onboardingContext(s, agentId)
  if (!record) return null
  const fields = jobFields(s, agentId)
  const done = fields.filter((f) => f.done).length
  const items = recordItems(s, agentId)
  const open = openStep(s, agentId)
  const first = firstMissingField(s, agentId)
  const { job } = record

  const next = fields.flatMap((f): { field: JobFieldId; label: string }[] => {
    if (f.done) return []
    if (f.id !== 'criteria') return [{ field: f.id, label: FIELD_NAMES[f.id] }]
    const missing = template.criteria.filter((c) => (job.targets[c.id] ?? null) === null)
    return missing.length === template.criteria.length ? [{ field: 'criteria', label: FIELD_NAMES.criteria }] : missing.map((c) => ({ field: 'criteria' as const, label: `${c.short} target` }))
  })
  const systems = systemsProgress(s, agentId)
  const limits = limitsProgress(record)
  const alsoNeeded = [
    ...(systems.complete ? [] : [`Systems and verbs · ${personName(s, people.owner)}`]),
    ...(limits.total && limits.tested === limits.total ? [] : [`${limits.total ? `${limits.total} hard stops` : 'Hard stops'} · ${personName(s, people.tech)}`]),
  ]
  const welcome =
    open?.step === 'job' && open.waitingOn === viewer && record.savedAt.slice(0, 10) < s.now.slice(0, 10) && first
      ? {
          title: `Welcome back, ${personName(s, viewer)}`,
          text: `You left this draft on ${formatDate(record.savedAt)} at ${formatClock(record.savedAt)} with ${done} of 7 fields done. It’s open at the first missing one, ${FIELD_NAMES[first]}.`,
          saved: `Autosaved ${formatClock(record.savedAt)} · v0.${record.version}`,
        }
      : null
  return {
    agentName: s.agents.find((a) => a.id === agentId)?.name ?? '',
    owner: personName(s, people.owner),
    sponsor: personName(s, people.sponsor),
    tech: personName(s, people.tech),
    requestCode: intake?.code ?? '',
    frozen: Boolean(record.frozenAt),
    done,
    fields,
    first,
    items,
    welcome,
    blocked: { left: items.total - items.done, next },
    alsoNeeded,
    job,
    never: [
      ...job.never.map((text) => {
        const limit = record.limits.find((l) => l.from === text)
        return { text, becomes: limit?.code ?? '', plain: !limit?.library, locked: false }
      }),
      { text: ORG_NEVER, becomes: ORG_POL_02, plain: false, locked: true },
    ],
    criteria: template.criteria.map((c) => ({ ...c, target: job.targets[c.id] ?? null })),
    actingForOptions: template.actingForOptions,
    actingForNote: template.actingForNote,
    suggestionsLabel: template.suggestionsLabel,
    suggestions: template.escalationSuggestions.filter((t) => !job.escalation.some((e) => e.toLowerCase() === t.toLowerCase())),
  }
}

const VERB_ORDER: Verb[] = ['read', 'draft', 'write', 'submit', 'sign', 'order']
const WHY_NAME: Record<string, string> = { 'Microsoft Teams': 'Teams' }

/** Step 3, systems and verbs (1c): the grid, why each grant, the reach line, and what's left. */
export function selectSystemsStep(s: DemoState, agentId: string) {
  const { record, template, people } = onboardingContext(s, agentId)
  if (!record) return null
  const grants = record.grants
  const unexplained = (system: string, verb: Verb) => {
    const g = grants.find((x) => x.system === system && x.verb === verb)
    return Boolean(g && needsReason(g, grants) && g.activity === null)
  }
  const rows = template.systems.map(({ system, detail }) => ({
    system,
    detail,
    cells: Object.fromEntries(
      VERB_ORDER.map((verb): [Verb, GrantCell] => [
        verb,
        verb === 'sign' || verb === 'order' ? 'locked' : !grants.some((g) => g.system === system && g.verb === verb) ? 'none' : unexplained(system, verb) ? 'changed' : 'granted',
      ]),
    ) as Record<Verb, GrantCell>,
  }))
  const why = template.systems.flatMap(({ system }) =>
    VERB_ORDER.flatMap((verb) => {
      const g = grants.find((x) => x.system === system && x.verb === verb)
      if (!g || !needsReason(g, grants)) return []
      return [{ key: `${system}·${verb}`, system, verb, label: `${WHY_NAME[system] ?? system} · ${verb}`, activity: g.activity, why: g.why, isNew: g.activity === null }]
    }),
  )
  const progress = systemsProgress(s, agentId)
  const items = recordItems(s, agentId)
  const limits = limitsProgress(record)
  const selected = why.find((w) => w.isNew)?.system
  const owner = personName(s, people.owner)
  const tech = personName(s, people.tech)
  return {
    frozen: Boolean(record.frozenAt),
    owner,
    tech,
    sponsor: personName(s, people.sponsor),
    meta: progress.complete ? `${owner} · done` : `${owner} · ${progress.done} of ${progress.total}`,
    rows,
    selected,
    why,
    purposes: [
      { value: 'all', label: purposeText(record, 'all') },
      ...record.job.activities.map((a) => ({ value: a.id, label: a.name })),
      { value: 'escalation', label: purposeText(record, 'escalation') },
    ],
    reach: reachLine(grants),
    progress,
    items,
    alsoNeeded: limits.total && limits.tested === limits.total ? [] : [`${limits.total ? `${limits.total} hard stops` : 'Hard stops'} · ${tech}`],
    next: why.filter((w) => w.isNew).map((w) => `${w.label} needs its activity`),
  }
}

const n = (value: number) => value.toLocaleString('en-US')

/** "tested just now" in the same minute, otherwise "tested 06 Oct". */
const testedWhen = (at: string, now: string) => (at.slice(0, 16) === now.slice(0, 16) ? 'tested just now' : `tested ${formatDate(at)}`)

/** Step 4, tools and hard stops (1d, 1g): the catalogue tools for the grants, and each limit with its test. */
export function selectToolsStep(s: DemoState, agentId: string) {
  const { record, people } = onboardingContext(s, agentId)
  if (!record) return null
  const owner = personName(s, people.owner)
  const tech = personName(s, people.tech)
  const sponsor = personName(s, people.sponsor)
  const tools = record.grants
    .filter((g) => needsReason(g, record.grants))
    .map((g) => ({ id: `${g.system}·${g.verb}`, tool: gatewayTool(g.system, g.verb), grants: `${WHY_NAME[g.system] ?? g.system} · ${g.verb}`, for: g.activity ? purposeText(record, g.activity).replace(/^Escalation: .*/, 'Escalation') : 'Activity not named' }))
  const limits = record.limits.map((l) => ({
    code: l.code,
    label: `${l.code} v${l.version}`,
    title: l.title,
    text: l.text,
    from: l.from,
    library: l.library ?? null,
    owner: `${personName(s, l.ownerId)} · technical owner`,
    tested: Boolean(l.test && !l.reopened),
    reopened: Boolean(l.reopened),
    test: l.test
      ? {
          head: `Tested on the last 30 days · ${formatDate(l.test.at)} ${formatClock(l.test.at)}`,
          result: `Would have blocked ${n(l.test.blocked)} of ${n(l.test.of)}`,
          resultLong: `Would have blocked ${n(l.test.blocked)} of ${n(l.test.of)} drafts`,
          when: l.test.casesId ? `re-tested ${formatDate(l.test.at)} · ${RETEST_CASES.sets[l.test.casesId]?.label ?? ''}` : `${testedWhen(l.test.at, s.now)}${l.test.examples.length ? ` · ${l.test.examples.length} examples` : l.test.blocked === 0 ? ' · nothing would have been blocked' : ''}`,
          blocks: `${l.test.blocked} ${l.test.blocked === 1 ? 'block' : 'blocks'}`,
          examples: l.test.examples.map((e) => ({ ...e, date: formatDate(e.date) })),
        }
      : null,
    last: l.previousTest && l.reopened ? `Last result: would have blocked ${n(l.test?.blocked ?? 0)} of ${n(l.test?.of ?? 0)} · last 30 days · ${formatDate(l.test!.at)}` : null,
  }))
  const progress = limitsProgress(record)
  const items = recordItems(s, agentId)
  return {
    frozen: Boolean(record.frozenAt),
    owner,
    tech,
    sponsor,
    meta: `${tech} · ${progress.tested} of ${progress.total}`,
    tools,
    limits,
    progress,
    items,
    ready: readyToSend(s, agentId),
    state: record.sponsor.state,
    sentAt: record.sponsor.sentAt,
    returned: record.sponsor.returned ?? null,
  }
}
