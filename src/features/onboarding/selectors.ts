import { gatewayTool, ORG_NEVER, ORG_POL_02, RETEST_CASES } from '../../data/seed/catalogue'
import type { DemoState, Domain, GrantCell, Verb } from '../../data/types'
import { formatDay } from '../../lib/clock'
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

/** The board's decision, as a status (2d "Approved with conditions"). */
export const DECISION_LABEL = { approve: 'Approved', approveWithConditions: 'Approved with conditions', reReview: 'Re-review', deny: 'Denied' } as const

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
  const decision = record.review?.decision
  const status = frozen ? (decision ? DECISION_LABEL[decision.kind] : 'In review') : review === 'waiting' ? 'Onboarding · waiting for sponsor' : review === 'returned' ? 'Onboarding · returned' : 'Onboarding · draft'
  const decided = Boolean(decision)
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
    // The sponsor's view of a sent set carries no autosave (1e); the builders' does (1b–1d, 1g).
    saved: frozen || review === 'waiting' ? null : record.savedAt,
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
    returnedToOwner: record.sponsor.state === 'returned' && record.sponsor.returned?.to === people.owner,
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
          on: formatDate(l.test.at),
          examples: l.test.examples.map((e) => ({ ...e, date: formatDate(e.date) })),
        }
      : null,
    last: l.reopened && l.test ? `Last result: would have blocked ${n(l.test.blocked)} of ${n(l.test.of)} · ${l.test.casesId ? RETEST_CASES.sets[l.test.casesId]?.label : 'last 30 days'} · ${formatDate(l.test.at)}` : null,
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

/** "Prepare admission…" → "Prepares admission…": the sponsor and the committee read the job in the third person (1e, 2c). */
export function thirdPerson(text: string): string {
  const [first = '', ...rest] = text.split(' ')
  const verb = /[^aeiou]y$/.test(first) ? `${first.slice(0, -1)}ies` : /(s|sh|ch|x|z|o)$/.test(first) ? `${first}es` : `${first}s`
  return [verb, ...rest].join(' ')
}

const pct1 = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)} %`)

/** The job, reach and limits as one page (1e, 2c), shared by the sponsor's review and the committee packet. */
export function selectFinalSet(s: DemoState, agentId: string) {
  const { record, template, people } = onboardingContext(s, agentId)
  if (!record) return null
  const owner = personName(s, people.owner)
  const tech = personName(s, people.tech)
  const verbs = (system: string) => VERB_ORDER.filter((v) => record.grants.some((g) => g.system === system && g.verb === v))
  const lastTest = record.limits.map((l) => l.test?.at ?? '').sort().at(-1)
  const tools = record.grants.filter((g) => needsReason(g, record.grants)).length
  return {
    job: {
      heading: `Job · ${owner}${record.done.job ? ` · ${formatDate(record.done.job.at)}` : ''}`,
      purpose: thirdPerson(record.job.purpose),
      does: record.job.activities.map((a) => ({ id: a.id, name: thirdPerson(a.name), branch: a.branch })),
      never: record.job.never.map((text) => ({ text: thirdPerson(text), code: record.limits.find((l) => l.from === text)?.code ?? '' })),
      handsOff: record.job.escalation,
      actsFor: record.job.actingFor ?? '—',
      goesLive: template.criteria.map((c) => ({ id: c.id, text: `${c.label} ${c.direction === 'atLeast' ? 'at least' : 'at most'} ${pct1(record.job.targets[c.id] ?? null)}`, short: `${c.label} ${c.direction === 'atLeast' ? '≥' : '≤'} ${pct1(record.job.targets[c.id] ?? null)}` })),
      worksOn: `${record.job.domain.units.join(' and ')} · ${record.job.domain.patients.toLowerCase()} · ${record.job.domain.hours.toLowerCase()}`,
    },
    reach: {
      heading: `Reach · ${owner}${record.done.systems ? ` · ${formatDate(record.done.systems.at)}` : ''}`,
      rows: template.systems.filter(({ system }) => verbs(system).length).map(({ system }) => ({ system, verbs: verbs(system).map((v, i) => (i ? v : v.charAt(0).toUpperCase() + v.slice(1))).join(', ') })),
    },
    limits: {
      heading: `Limits · ${tech}${lastTest ? ` · ${formatDate(lastTest)}` : ''}`,
      rows: record.limits.map((l) => ({
        code: l.code,
        label: `${l.code} v${l.version}`,
        title: l.title,
        result: l.test ? `Would have blocked ${n(l.test.blocked)} of ${n(l.test.of)}${l.test.examples.length ? ` · ${l.test.examples.length} examples` : ''}` : 'Not tested',
        retest: l.test?.casesId ? `Re-tested on ${RETEST_CASES.sets[l.test.casesId]?.label ?? ''}, as ${personName(s, people.sponsor)} asked` : null,
        shortResult: l.test ? `Would have blocked ${n(l.test.blocked)} of ${n(l.test.of)}` : 'Not tested',
      })),
      tools: `${tools} gateway tools, each matching a grant above`,
    },
  }
}

/** Step 5, sponsor approval (1e, 1f): state, who did what, and the round note. */
export function selectApprovalStep(s: DemoState, agentId: string, viewer: string) {
  const { record, people } = onboardingContext(s, agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!record || !agent) return null
  const sponsorName = personName(s, people.sponsor)
  const you = viewer === people.sponsor
  const review = record.sponsor
  const lastReturn = review.earlier.filter((e) => e.kind === 'returned').at(-1)
  const lastReset = review.earlier.at(-1)?.kind === 'reset'
  const retested = lastReturn?.about ? record.limits.find((l) => l.code === lastReturn.about)?.test : undefined
  const roundNote =
    review.round <= 1 && !review.earlier.length
      ? { lead: 'First review.', text: `Nothing has been approved or sent back before. If anyone edits the record after ${you ? 'you approve, your approval resets and you’re' : `${sponsorName} approves, the approval resets and ${sponsorName} is`} asked again.` }
      : lastReset
        ? { lead: `Review ${review.round}.`, text: 'An edit reset the last review, so the set was sent again.' }
        : {
            lead: `Review ${review.round}.`,
            text: `${sponsorName} sent ${lastReturn?.about ?? 'the job and reach'} back on ${lastReturn ? formatDate(lastReturn.at) : ''}${retested ? `; ${personName(s, retested.by)} re-tested it: ${n(retested.blocked)} of ${n(retested.of)} would have been blocked` : ''}.`,
          }
  const who = [
    record.done.intake && { text: `${personName(s, record.done.intake.by)} · intake`, date: formatDate(record.done.intake.at) },
    record.done.job && { text: `${personName(s, record.done.job.by)} · job description`, date: formatDate(record.done.job.at) },
    record.done.systems && { text: `${personName(s, record.done.systems.by)} · systems and verbs`, date: formatDate(record.done.systems.at) },
    record.done.tools && { text: `${personName(s, people.tech)} · tools and hard stops`, date: formatDate(record.done.tools.at) },
  ].filter(Boolean) as { text: string; date: string }[]
  return {
    state: review.state,
    you,
    sponsorId: people.sponsor,
    sponsor: sponsorName,
    owner: { id: people.owner, name: personName(s, people.owner) },
    tech: { id: people.tech, name: personName(s, people.tech) },
    sent: review.sentAt ? `Sent by ${personName(s, review.sentBy)} · ${formatDate(review.sentAt)} ${formatClock(review.sentAt)}` : null,
    waiting: review.sentAt ? `Waiting for ${you ? 'you' : sponsorName} since ${formatDate(review.sentAt)} ${formatClock(review.sentAt)}` : null,
    signed: review.signedAt ? `Signed by ${sponsorName} · ${formatDate(review.signedAt)} ${formatClock(review.signedAt)}` : null,
    returned: review.returned ? { to: personName(s, review.returned.to), at: formatDate(review.returned.at) } : null,
    signLine: `Signs ${you ? 'you' : sponsorName} as sponsor of ${agent.code} v0.${record.version}, logged with time and version. The record moves to AIMS Review.`,
    who,
    roundNote,
  }
}

/** What the sponsor sent back (1g), for the person it went to. */
export function selectReturned(s: DemoState, agentId: string, viewer: string) {
  const { record, people } = onboardingContext(s, agentId)
  const returned = record?.sponsor.returned
  if (!record || !returned) return null
  const limit = returned.about ? record.limits.find((l) => l.code === returned.about) : undefined
  return {
    sponsor: personName(s, people.sponsor),
    to: returned.to,
    toName: personName(s, returned.to),
    head: `${formatDate(returned.at)} ${formatClock(returned.at)}${limit ? ` · about ${limit.code} v${limit.version}` : ''}`,
    note: returned.note,
    reply: returned.reply ? { text: returned.reply.text, at: `${formatDate(returned.reply.at)} ${formatClock(returned.reply.at)}` } : null,
    canReply: viewer === returned.to,
    about: limit ? { code: limit.code, label: `${limit.code} v${limit.version}`, title: limit.title, reopened: Boolean(limit.reopened) } : null,
  }
}

/** Step 6, ready for review (1h): the sponsor's signature, the rounds, and what happens next. */
export function selectReviewStep(s: DemoState, agentId: string) {
  const { record, people } = onboardingContext(s, agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!record || !agent || record.sponsor.state !== 'signed' || !record.sponsor.signedAt) return null
  const sponsor = personName(s, people.sponsor)
  const tech = personName(s, people.tech)
  const chair = personName(s, s.roles.find((r) => r.role === 'committee')?.personId)
  const signedAt = record.sponsor.signedAt
  const tools = record.grants.filter((g) => needsReason(g, record.grants)).length
  const rounds = record.sponsor.earlier.filter((e) => e.kind === 'returned')
  const last = rounds.at(-1)
  const limit = last?.about ? record.limits.find((l) => l.code === last.about) : undefined
  const set = last?.casesId ? RETEST_CASES.sets[last.casesId] : undefined
  const count = rounds.length === 1 ? 'one round' : `${rounds.length} rounds`
  const roundsText = !rounds.length
    ? 'Signed on the first review.'
    : limit && set && limit.test
      ? `Signed after ${count} of changes: ${sponsor} asked for ${limit.code} to be re-tested on ${set.phrase}. ${tech} re-ran it: ${n(limit.test.blocked)} of ${n(limit.test.of)} would have been blocked. Both notes stay on the record.`
      : `Signed after ${count} of changes: ${sponsor} asked about ${last?.about ?? 'the job and reach'}. Both notes stay on the record.`
  const meeting = record.review?.meeting
  const year = signedAt.slice(0, 4)
  const step = (key: 'intake' | 'job' | 'systems' | 'tools') => record.done[key]
  return {
    signature: [
      ['Signed by', `${sponsor} · clinical sponsor`],
      ['When', `${formatDate(signedAt)} ${year} · ${formatClock(signedAt)}`],
      ['Version', `${agent.code} v1.0`],
      ['Covers', `Job, reach, ${tools} tools, ${record.limits.length} hard stops`],
    ] as [string, string][],
    rounds: roundsText,
    next: [
      ['Risk tier', `AIMS Review assigns it. ${personName(s, people.lead)} is told when it’s set.`],
      ['Committee packet', `Built from this record for ${chair}, the committee chair.${meeting ? ` Next meeting ${formatDate(meeting)}.` : ''}`],
      ['The agent', 'Stays a shadow-ready draft. It can’t act until the committee approves and a privilege is signed.'],
      ['Changes', `Frozen at v1.0. A change needs a new version and ${sponsor}’s approval again; AIMS Review is told.`],
    ] as [string, string][],
    side: {
      title: `Onboarding · ${recordItems(s, agentId).done} of ${recordItems(s, agentId).total}`,
      sub: `Complete · ${formatDate(record.startedAt)} to ${formatDate(signedAt)}`,
      rows: [
        { label: 'Intake', who: personName(s, step('intake')?.by ?? record.startedBy) },
        { label: `Job description · ${jobFields(s, agentId).length}`, who: personName(s, step('job')?.by ?? people.owner) },
        { label: 'Systems and verbs', who: personName(s, step('systems')?.by ?? people.owner) },
        { label: `Tools and hard stops · ${record.limits.length}`, who: tech },
        { label: 'Sponsor approval', who: sponsor },
      ],
      decided: record.review?.decision ? `Decided by ${personName(s, record.review.decision.by)} · ${formatDay(record.review.decision.at)}` : null,
      waiting: `Waiting on AIMS Review. Nothing is needed from ${listNames([people.lead, people.owner, people.tech, people.sponsor].map((id) => personName(s, id)))} until the committee meets.`,
    },
  }
}

const listNames = (names: string[]) => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`)
