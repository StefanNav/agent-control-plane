import { BOARD_MEETINGS, HARD_STOP_LIBRARY, resolveConditions, RETEST_CASES, TIER_RULES } from '../data/seed/catalogue'
import { agentFromIntake } from '../data/seed/onboarding'
import type { AgentException, Condition, DemoState, GrantCell, JobDraft, Limit, LimitTest, Onboarding, Privilege, ReviewDecision, Tier, Verb } from '../data/types'
import { addDays, formatDate, tomorrowAt } from '../lib/clock'
import { markCallerOnboarding } from './gateway'
import { nextArchiveCode, nextExceptionCode, nextHardStopCode, nextPrivilegeCode, nextVersion } from './mutations'
import { conditionRange, criteriaStatus, jobFields, onboardingContext, personName, recordItems, recordOfActivity, riskFactors, systemsProgress, templateFor } from './onboardingRules'

/**
 * Onboarding state changes, shared by store actions and scenarios so a scenario builds exactly
 * the state the UI would (as mutations.ts does for pauses). Each mutates the draft it is given.
 */

/** Start onboarding from an approved intake (1a): the draft agent and its record at v0.1. */
export function applyStart(s: DemoState, intakeId: string, people: { ownerId: string; techOwnerId: string }, by: string, at: string): DemoState {
  const intake = s.intakeRequests.find((r) => r.id === intakeId)
  if (!intake) return s
  const template = templateFor(intake)
  s.agents.push(agentFromIntake(intake, people, at))
  s.onboardings.push({
    agentId: intake.agentId,
    intakeId,
    startedAt: at,
    startedBy: by,
    version: 1,
    savedAt: at,
    job: {
      purpose: intake.purpose,
      activities: [],
      never: [],
      actingFor: null,
      escalation: [],
      targets: Object.fromEntries(template.criteria.map((c) => [c.id, null])),
      domain: structuredClone(intake.domain),
    },
    grants: [],
    limits: [],
    sponsor: { state: 'notSent', round: 0, earlier: [] },
    done: { intake: { at, by } },
    history: [{ at, by, text: `${personName(s, by)} · started onboarding`, sub: `From ${intake.code}` }],
  })
  intake.startedAt = at
  markCallerOnboarding(s, intakeId, intake.agentId, by, at)
  return s
}

/** Same never-list wording, ignoring case, spacing and apostrophe style. */
const sameWords = (a: string, b: string) => a.replace(/[’']/g, "'").trim().toLowerCase() === b.replace(/[’']/g, "'").trim().toLowerCase()
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** One limit per never-list item, kept in list order (ruling R10): library match or plain language. */
export function syncLimits(s: DemoState, record: Onboarding): void {
  const { people } = onboardingContext(s, record.agentId)
  const made: Limit[] = []
  for (const item of record.job.never) {
    const existing = record.limits.find((l) => sameWords(l.from, item))
    if (existing) {
      made.push(existing)
      continue
    }
    const rule = HARD_STOP_LIBRARY.find((r) => sameWords(r.matches, item))
    made.push(
      rule
        ? { code: rule.code, version: 1, title: rule.title, text: rule.text, from: item, library: rule.rule, ownerId: people.tech }
        : {
            code: nextHardStopCode(s, made.map((l) => l.code), HARD_STOP_LIBRARY.map((r) => r.code)),
            version: 1,
            title: `Never ${lowerFirst(item)}`,
            text: `Written in plain language from the never list: the gateway blocks a draft that would ${lowerFirst(item)} and flags it for review.`,
            from: item,
            ownerId: people.tech,
          },
    )
  }
  record.limits = made
}

const cleanList = (items: string[]) => {
  const out: string[] = []
  for (const raw of items) {
    const item = raw.trim()
    if (item && !out.some((o) => sameWords(o, item))) out.push(item)
  }
  return out
}

/** Save an edit to the job description (1b): limits follow the never list; done is set or cleared. */
export function applyJobEdit(s: DemoState, agentId: string, patch: Partial<JobDraft>, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  if (!record) return s
  const job = record.job
  if (patch.purpose !== undefined) job.purpose = patch.purpose.trim()
  if (patch.activities) job.activities = patch.activities.filter((a, i, all) => a.name.trim() && all.findIndex((b) => sameWords(b.name, a.name)) === i)
  if (patch.never) job.never = cleanList(patch.never)
  if (patch.actingFor !== undefined) job.actingFor = patch.actingFor
  if (patch.escalation) job.escalation = cleanList(patch.escalation)
  if (patch.targets) job.targets = { ...job.targets, ...patch.targets }
  if (patch.domain) job.domain = { ...job.domain, ...patch.domain, units: cleanList(patch.domain.units ?? job.domain.units) }
  syncLimits(s, record)
  record.version += 1
  record.savedAt = at
  resetIfWaiting(s, record, by, at)
  if (jobFields(s, agentId).every((f) => f.done)) record.done.job ??= { at, by }
  else delete record.done.job
  return s
}

/** 17:00 two days after `at`: the deadline for an onboarding hand-off. */
const handOffDeadline = (at: string) => `${addDays(at, 2).slice(0, 10)}T17:00:00`

/** Raise an onboarding hand-off in someone's inbox (ruling R9): a review item that links to the step. */
export function raiseItem(
  s: DemoState,
  input: { agentId: string; type: string; reason: string; action: string; actionSub: string; ownerId: string; copied: string[]; link: { label: string; to: string }; at: string; deadline?: string },
): AgentException {
  const code = nextExceptionCode(s)
  const item: AgentException = {
    id: code.toLowerCase(),
    code,
    status: 'review',
    kind: 'review',
    type: input.type,
    reason: input.reason,
    agentId: input.agentId,
    raisedAt: input.at,
    action: input.action,
    actionSub: input.actionSub,
    ownerId: input.ownerId,
    copied: input.copied.filter((p) => p !== input.ownerId),
    deadline: input.deadline ?? handOffDeadline(input.at),
    state: 'new',
    route: 'inbox',
    link: input.link,
  }
  s.exceptions.push(item)
  return item
}

/** Close the open hand-offs of a type once their step is done. */
export function resolveItems(s: DemoState, agentId: string, type: string, by: string, at: string, outcome: string): void {
  for (const e of s.exceptions)
    if (e.agentId === agentId && e.type === type && e.state !== 'resolved' && e.state !== 'dismissed')
      Object.assign(e, { state: 'resolved', outcome, closedAt: at, closedBy: by })
}

const openItem = (s: DemoState, agentId: string, type: string) => s.exceptions.some((e) => e.agentId === agentId && e.type === type && e.state !== 'resolved' && e.state !== 'dismissed')

export type SystemsChange = { kind: 'grant'; system: string; verb: Verb; on: boolean } | { kind: 'reason'; system: string; verb: Verb; activity: string; why?: string }

/** What a grant's activity says when no reason is written (1c). */
export function purposeText(record: Onboarding, activity: string): string {
  if (activity === 'all') return record.job.activities.length === 2 ? 'Both activities' : `All ${record.job.activities.length} activities`
  if (activity === 'escalation') return 'Escalation: tell the pharmacist why the case was handed over'
  return record.job.activities.find((a) => a.id === activity)?.name ?? activity
}

/** Tick a cell or name the activity it serves (1c); finishing the grid sends the technical owner the hard stops. */
export function applySystemsEdit(s: DemoState, agentId: string, change: SystemsChange, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  if (!record) return s
  const index = record.grants.findIndex((g) => g.system === change.system && g.verb === change.verb)
  if (change.kind === 'grant') {
    if (change.on && index < 0) record.grants.push({ system: change.system, verb: change.verb, activity: null, why: '', added: at })
    if (!change.on && index >= 0) record.grants.splice(index, 1)
  } else if (index >= 0) {
    Object.assign(record.grants[index]!, { activity: change.activity, why: change.why ?? purposeText(record, change.activity) })
  }
  record.version += 1
  record.savedAt = at
  resetIfWaiting(s, record, by, at)
  const { people } = onboardingContext(s, agentId)
  if (systemsProgress(s, agentId).complete) {
    if (!record.done.systems) {
      record.done.systems = { at, by }
      if (record.limits.length && !openItem(s, agentId, 'Tools: hard stops to test'))
        raiseItem(s, {
          agentId,
          type: 'Tools: hard stops to test',
          reason: `${record.limits.length} hard stops from ${personName(s, people.owner)}’s never list to test on the last 30 days`,
          action: 'test the hard stops',
          actionSub: `Then send the set to ${personName(s, people.sponsor)}`,
          ownerId: people.tech,
          copied: [people.owner],
          link: { label: 'Open tools and hard stops', to: `/inventory/agents/${agentId}/onboarding/tools` },
          at,
        })
    }
  } else delete record.done.systems
  return s
}

/** A small, stable number from text: plain-language results are derived, not random (ruling R10). */
const derived = (text: string, max: number) => [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7) % (max + 1)

/** What a test would find: recorded library results for this agent, otherwise derived; scaled to a case set. */
export function testResult(s: DemoState, agentId: string, code: string, casesId?: string): Pick<LimitTest, 'blocked' | 'of' | 'examples'> {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const limit = record?.limits.find((l) => l.code === code)
  if (!record || !limit) return { blocked: 0, of: 0, examples: [] }
  const sample = templateFor(s.intakeRequests.find((r) => r.id === record.intakeId)).testSample
  const recorded = HARD_STOP_LIBRARY.find((r) => r.rule === limit.library)?.results[agentId]
  const base = recorded ?? { blocked: derived(`${agentId}${limit.from}`, 4), examples: [] }
  const set = casesId ? RETEST_CASES.sets[casesId] : undefined
  const of = set?.of ?? sample
  const blocked = set ? Math.round((base.blocked * of) / sample) : base.blocked
  return { blocked, of, examples: base.examples.slice(0, blocked) }
}

/** Test a hard stop on the last 30 days, or on a named case set (1d, 1g). The previous result is kept. */
export function applyTest(s: DemoState, agentId: string, code: string, casesId: string | undefined, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const limit = record?.limits.find((l) => l.code === code)
  if (!record || !limit) return s
  const { blocked, of, examples } = testResult(s, agentId, code, casesId)
  const set = casesId ? RETEST_CASES.sets[casesId] : undefined
  if (limit.test) limit.previousTest = limit.test
  limit.test = { at, by, blocked, of, ...(casesId ? { casesId } : {}), examples }
  resetIfWaiting(s, record, by, at)
  delete limit.reopened
  record.history.push({ at, by, text: `${personName(s, by)} · ${set ? 're-tested' : 'tested'} ${code}`, sub: `${blocked} of ${of.toLocaleString('en-US')} would have been blocked` })
  return s
}

/** Send the finished set to the sponsor (1d): their review opens; any open hand-offs for the set close. */
export function applySend(s: DemoState, agentId: string, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!record || !agent) return s
  const { people } = onboardingContext(s, agentId)
  const sponsor = record.sponsor
  if (sponsor.returned) {
    sponsor.earlier.push({ at: sponsor.returned.at, kind: 'returned', to: sponsor.returned.to, about: sponsor.returned.about, note: sponsor.returned.note, casesId: record.limits.find((l) => l.code === sponsor.returned?.about)?.test?.casesId })
    delete sponsor.returned
  }
  sponsor.round += 1
  Object.assign(sponsor, { state: 'waiting', sentAt: at, sentBy: by })
  record.done.tools = { at, by }
  record.history.push({ at, by, text: `${personName(s, by)} · sent to ${personName(s, people.sponsor)}${sponsor.round > 1 ? ' again' : ''}` })
  resolveItems(s, agentId, 'Tools: hard stops to test', by, at, 'Sent to the sponsor')
  for (const e of s.exceptions) if (e.agentId === agentId && e.type.startsWith('Returned:') && e.state !== 'resolved') Object.assign(e, { state: 'resolved', outcome: 'Sent back to the sponsor', closedAt: at, closedBy: by })
  const items = recordItems(s, agentId)
  raiseItem(s, {
    agentId,
    type: 'Review: final set',
    reason: `${agent.name}: job, reach and limits, as the committee will read them`,
    action: 'approve the set or send it back',
    actionSub: `${items.done} of ${items.total} items done · ${agent.code} v0.${record.version}`,
    ownerId: people.sponsor,
    copied: [people.owner, people.tech],
    link: { label: 'Open the final set', to: `/inventory/agents/${agentId}/onboarding/approval` },
    at,
  })
  return s
}

/** Any edit while the sponsor is reviewing resets the review (1d: "Any edit after you send resets her review"). */
function resetIfWaiting(s: DemoState, record: Onboarding, by: string, at: string): void {
  if (record.sponsor.state !== 'waiting') return
  record.sponsor.state = 'notSent'
  record.sponsor.earlier.push({ at, kind: 'reset', note: 'Review reset by an edit' })
  resolveItems(s, record.agentId, 'Review: final set', by, at, 'Reset: record edited')
  const { people } = onboardingContext(s, record.agentId)
  record.history.push({ at, by, text: `${personName(s, by)} · edited the set`, sub: `${personName(s, people.sponsor)}’s review reset` })
}

/** The sponsor sends the set back with a note (1f): only the row it's about reopens. */
export function applyRequestChanges(s: DemoState, agentId: string, input: { to: string; about?: string; note: string }, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  if (!record) return s
  record.sponsor.state = 'returned'
  record.sponsor.returned = { to: input.to, ...(input.about ? { about: input.about } : {}), note: input.note, at }
  const limit = input.about ? record.limits.find((l) => l.code === input.about) : undefined
  if (limit) limit.reopened = { by, at }
  resolveItems(s, agentId, 'Review: final set', by, at, 'Changes requested')
  const toTools = Boolean(limit)
  raiseItem(s, {
    agentId,
    type: `Returned: ${limit ? limit.code : 'job and reach'}`,
    reason: input.note,
    action: limit ? `re-test ${limit.code}` : 'revise the job and reach',
    actionSub: `${personName(s, by)} sent it back`,
    ownerId: input.to,
    copied: [by],
    link: { label: toTools ? 'Open tools and hard stops' : 'Open the job description', to: `/inventory/agents/${agentId}/onboarding/${toTools ? 'tools' : 'job'}` },
    at,
  })
  record.history.push({ at, by, text: `${personName(s, by)} · requested changes`, sub: limit ? `About ${limit.code} v${limit.version}` : 'About job and reach', decision: true })
  return s
}

/** The person it went back to answers the sponsor (1g "Reply to Priya"). */
export function applyReply(s: DemoState, agentId: string, text: string, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  if (!record?.sponsor.returned) return s
  record.sponsor.returned.reply = { text, at }
  record.history.push({ at, by, text: `${personName(s, by)} · replied`, sub: text })
  return s
}

/** "21-day shadow before any Draft privilege" → 21. */
const intakeShadowDays = (text: string | undefined) => Number(/(\d+)-day shadow/.exec(text ?? '')?.[1] ?? 0)

/** The sponsor approves and signs the set (1e → 1h): v1.0, frozen, with AIMS Review. */
export function applySponsorSign(s: DemoState, agentId: string, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  if (!record || !agent) return s
  const { intake, template, people } = onboardingContext(s, agentId)
  const rounds = record.sponsor.earlier.filter((e) => e.kind === 'returned')
  Object.assign(record.sponsor, { state: 'signed', signedAt: at })
  record.version = 10
  record.savedAt = at
  record.frozenAt = at
  agent.lifecycle = 'inReview'
  for (const a of record.job.activities)
    if (!s.activities.some((x) => x.id === a.id)) s.activities.push({ id: a.id, agentId, name: a.name, level: 'shadow', reviewLevel: 'normal', branches: [] })
  const domain = `${record.job.domain.units.join(', ')} · ${record.job.domain.patients.toLowerCase()}`
  for (const a of record.job.activities) {
    const code = nextPrivilegeCode(s)
    s.privileges.push({ id: `${code.toLowerCase()}-v1`, code, version: 1, activityId: a.id, agentId, level: 'shadow', domain, conditions: [], evidence: 'Awaiting the AI review board', state: 'awaiting', stepDownTriggers: [] })
  }
  const { suggested } = riskFactors(s, agentId)
  const meeting = BOARD_MEETINGS.find((m) => m > at) ?? BOARD_MEETINGS.at(-1)!
  record.review = {
    suggestedTier: suggested,
    meeting,
    proposedConditions: resolveConditions(template.conditions, record.job.activities.map((a) => a.id)),
    shadowDays: Math.max(TIER_RULES[suggested].shadowDays, intakeShadowDays(intake?.condition?.text)),
  }
  resolveItems(s, agentId, 'Review: final set', by, at, 'Approved and signed')
  raiseItem(s, {
    agentId,
    type: 'Review: risk tier',
    reason: `${agent.name} is frozen at v1.0. Set the risk tier to build the committee packet.`,
    action: 'set the risk tier',
    actionSub: `Suggested Tier ${suggested} · the board meets ${formatDate(meeting)}`,
    ownerId: people.lead,
    copied: [people.sponsor],
    link: { label: 'Open risk tier', to: `/inventory/agents/${agentId}/risk-tier` },
    at,
    // Due the day before the board meets, so the packet is ready in time.
    deadline: `${addDays(meeting, -1).slice(0, 10)}T17:00:00`,
  })
  const last = rounds.at(-1)
  record.history.push({
    at,
    by,
    text: `${personName(s, by)} · signed as sponsor`,
    sub: rounds.length ? `After ${rounds.length === 1 ? 'one round' : `${rounds.length} rounds`} of changes${last?.about ? ` on ${last.about}` : ''}` : 'First review',
    decision: true,
  })
  return s
}

/** The board's committee chair, who receives the packet. */
const chairOf = (s: DemoState) => s.roles.find((r) => r.role === 'committee')?.personId ?? 'drlee'

/** Dana sets the risk tier (2b): Tier 2 and above build the packet for the board; Tier 1 starts shadow (R7). */
export function applySetTier(s: DemoState, agentId: string, input: { tier: Tier; reason?: string }, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  const review = record?.review
  if (!record || !agent || !review) return s
  const { intake, people } = onboardingContext(s, agentId)
  Object.assign(review, { tier: input.tier, tierAt: at, tierBy: by, shadowDays: Math.max(TIER_RULES[input.tier].shadowDays, intakeShadowDays(intake?.condition?.text)) })
  if (input.reason) review.tierReason = input.reason
  agent.riskTier = input.tier
  resolveItems(s, agentId, 'Review: risk tier', by, at, `Set Tier ${input.tier}`)
  resolveItems(s, agentId, 'Re-review: questions from the board', by, at, `Set Tier ${input.tier} again`)
  record.history.push({
    at,
    by,
    text: `${personName(s, by)} · set Tier ${input.tier}`,
    sub: input.tier === review.suggestedTier ? 'As suggested' : `Suggested Tier ${review.suggestedTier} · reason recorded`,
    decision: true,
  })
  if (input.tier < 2) return applyShadowStart(s, agentId, by, at)
  review.packetAt = at
  const chair = chairOf(s)
  raiseItem(s, {
    agentId,
    type: 'Review: your decision',
    reason: `${agent.name} · Tier ${input.tier} · ${TIER_RULES[input.tier].label}. The packet is ready for the board.`,
    action: 'decide at the board meeting',
    actionSub: `${TIER_RULES[input.tier].board} · ${formatDate(review.meeting)}`,
    ownerId: chair,
    copied: [by, people.sponsor],
    link: { label: 'Open the packet', to: `/portfolio/reviews/${agentId}` },
    at,
    deadline: `${review.meeting.slice(0, 10)}T17:00:00`,
  })
  return s
}

const VERBS_ALL: Verb[] = ['read', 'draft', 'write', 'submit', 'sign', 'order']

/** Approval starts shadow the next day (2d): the agent goes live at Shadow with its v2 privileges, grants and hard stops. */
export function applyShadowStart(s: DemoState, agentId: string, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  const review = record?.review
  if (!record || !agent || !review) return s
  const { template } = onboardingContext(s, agentId)
  const from = tomorrowAt(at, '00:00')
  review.shadowFrom = from
  const end = addDays(from, review.shadowDays - 1)
  Object.assign(agent, {
    lifecycle: 'live',
    level: 'shadow',
    grantorId: by,
    reviewDate: end,
    judgment: { status: 'shadow', label: 'Shadow' },
    metrics: { ...agent.metrics, day: 0 },
    monitor: { lastSeen: at, expectedIntervalMin: 5 },
  })
  const conditions = review.decision?.conditions ?? []
  for (const a of record.job.activities) {
    const current = s.privileges.filter((p) => p.activityId === a.id).sort((x, y) => y.version - x.version)[0]
    const binds = conditions.filter((c) => !c.activityIds.length || c.activityIds.includes(a.id))
    const notes = binds.flatMap((c) => (c.domainNote ? [c.domainNote] : []))
    if (current) current.state = 'closed'
    const code = current?.code ?? nextPrivilegeCode(s)
    const version = (current?.version ?? 0) + 1
    s.privileges.push({
      id: `${code.toLowerCase()}-v${version}`,
      code,
      version,
      activityId: a.id,
      agentId,
      level: 'shadow',
      domain: [current?.domain ?? `${record.job.domain.units.join(', ')} · ${record.job.domain.patients.toLowerCase()}`, ...notes].join(' · '),
      conditions: binds.map((c) => c.id),
      evidence: 'Shadow validation in progress',
      grantedBy: by,
      grantedAt: at,
      state: 'active',
      stepDownTriggers: [],
    })
  }
  for (const { system, detail } of template.systems) {
    const verbs = record.grants.filter((g) => g.system === system).map((g) => g.verb)
    if (!verbs.length) continue
    s.grants = s.grants.filter((g) => !(g.agentId === agentId && g.system === system))
    s.grants.push({
      agentId,
      system,
      detail,
      cells: Object.fromEntries(VERBS_ALL.map((v): [Verb, GrantCell] => [v, v === 'sign' || v === 'order' ? 'locked' : verbs.includes(v) ? 'granted' : 'none'])) as Record<Verb, GrantCell>,
    })
  }
  for (const l of record.limits) {
    const id = `${agentId}-${l.code.toLowerCase()}`
    if (s.hardStops.some((h) => h.id === id)) continue
    s.hardStops.push({ id, code: l.code, version: l.version, title: l.title, text: l.text, ownerId: l.ownerId, approvedBy: s.agents.find((x) => x.id === agentId)!.sponsorId, approvedAt: record.sponsor.signedAt ?? at, agentId, blocks30d: l.test?.blocked ?? 0, actions30d: l.test?.of ?? 0, firedToday: 0 })
  }
  for (const a of record.job.activities)
    if (!s.scorecards.some((c) => c.activityId === a.id)) s.scorecards.push({ activityId: a.id, from, to: from, cases: 0, results: {}, causes: [], sampleCaseIds: [] })
  return s
}

export const DECISION_WORDS: Record<ReviewDecision['kind'], string> = {
  approve: 'approved',
  approveWithConditions: 'approved with conditions',
  reReview: 'sent back for re-review',
  deny: 'denied',
}

/** The board's decision (2c): approval starts shadow; re-review goes back to the program lead; deny archives. */
export function applyDecision(s: DemoState, agentId: string, input: { kind: ReviewDecision['kind']; conditions: Condition[]; reason: string }, by: string, at: string): DemoState {
  const record = s.onboardings.find((r) => r.agentId === agentId)
  const agent = s.agents.find((a) => a.id === agentId)
  const review = record?.review
  if (!record || !agent || !review) return s
  const { people } = onboardingContext(s, agentId)
  const conditions = input.kind === 'approveWithConditions' ? input.conditions : []
  const present = (review.tier ?? 2) >= 3 ? '5 of 7 board members present' : 'Chair decision'
  resolveItems(s, agentId, 'Review: your decision', by, at, `${DECISION_WORDS[input.kind].charAt(0).toUpperCase()}${DECISION_WORDS[input.kind].slice(1)}`)
  record.history.push({
    at,
    by,
    text: `${personName(s, by)} · ${DECISION_WORDS[input.kind]}${conditions.length ? ` ${conditionRange(conditions.map((c) => c.id))}` : ''}`,
    sub: `Reason recorded · ${present}`,
    decision: true,
  })
  if (input.kind === 'reReview') {
    // Back to the program lead with the board's questions: the tier and packet are redone for the next meeting.
    delete review.tier
    delete review.tierAt
    delete review.tierBy
    delete review.tierReason
    delete review.packetAt
    delete review.agendaItem
    review.meeting = BOARD_MEETINGS.find((m) => m > review.meeting) ?? review.meeting
    raiseItem(s, {
      agentId,
      type: 'Re-review: questions from the board',
      reason: input.reason,
      action: 'answer the board and rebuild the packet',
      actionSub: `Next meeting ${formatDate(review.meeting)}`,
      ownerId: people.lead,
      copied: [people.owner, people.sponsor],
      link: { label: 'Open risk tier', to: `/inventory/agents/${agentId}/risk-tier` },
      at,
    })
    return s
  }
  review.decision = { kind: input.kind, conditions, reason: input.reason, by, at, present }
  if (input.kind === 'deny') {
    agent.lifecycle = 'retired'
    agent.retirement = { at, by, code: nextArchiveCode(s), reason: `Denied by the AI review board: ${input.reason}` }
    agent.judgment = { status: 'normal', label: 'Retired' }
    for (const p of s.privileges) if (p.agentId === agentId) p.state = 'closed'
    return s
  }
  return applyShadowStart(s, agentId, by, at)
}

/** The latest version of an activity's privilege record. */
export const latestPrivilege = (s: DemoState, activityId: string) => s.privileges.filter((p) => p.activityId === activityId && p.state !== 'closed').sort((a, b) => b.version - a.version)[0]

/** The owner asks the sponsor to sign the move out of Shadow (3a): the next privilege version proposes Draft. */
export function applyGoLiveRequest(s: DemoState, activityId: string, by: string, at: string): DemoState {
  const activity = s.activities.find((a) => a.id === activityId)
  const current = latestPrivilege(s, activityId)
  if (!activity || !current) return s
  const agent = s.agents.find((a) => a.id === activity.agentId)!
  const version = nextVersion(s, current.code)
  const proposal = { ...current, id: `${current.code.toLowerCase()}-v${version}`, version, state: 'awaiting' as const, level: 'shadow' as const, proposedLevel: 'draft' as const, movedBy: by }
  delete proposal.grantedBy
  delete proposal.grantedAt
  delete proposal.reviewDate
  delete proposal.trigger
  s.privileges.push(proposal)
  const criteria = criteriaStatus(s, activityId)
  raiseItem(s, {
    agentId: agent.id,
    type: 'Review: your signature',
    reason: `${agent.name}: ${activity.name}, Shadow → Draft`,
    action: 'sign or send back',
    actionSub: `${criteria.filter((c) => c.met).length} of ${criteria.length} targets met · ${current.code} v${version}`,
    ownerId: agent.sponsorId,
    copied: [by],
    link: { label: 'Open the signature', to: `/inventory/privileges/${current.code.toLowerCase()}/sign` },
    at,
  })
  recordOfActivity(s, activityId)?.history.push({ at, by, text: `${personName(s, by)} · asked ${personName(s, agent.sponsorId)} to sign`, sub: `${current.code} v${version} · Shadow → Draft`, decision: true })
  return s
}

/** Run shadow longer before asking (3a "Extend shadow by 7 days"). */
export function applyExtendShadow(s: DemoState, activityId: string, days: number, by: string, at: string): DemoState {
  const card = s.scorecards.find((c) => c.activityId === activityId)
  const activity = s.activities.find((a) => a.id === activityId)
  if (!card || !activity) return s
  card.extendedDays = (card.extendedDays ?? 0) + days
  s.logEvents.push({ id: `log-extend-${s.logEvents.length + 1}`, at, agentId: activity.agentId, text: `Shadow extended by ${days} days`, sub: `${activity.name} · ${personName(s, by)}` })
  return s
}

/** Flag a sample-case line for the SOP (3b): the technical owner is asked to check the mapping. */
export function applyFlagLine(s: DemoState, caseId: string, line: number, by: string, at: string): DemoState {
  const c = s.sampleCases.find((x) => x.id === caseId)
  const l = c?.lines[line - 1]
  if (!c || !l) return s
  const agent = s.agents.find((a) => a.id === c.agentId)
  const word = (text: string | null) => (text ?? '').split(' ')[0] ?? ''
  const theirs = word(l.pharmacist)
  s.logEvents.push({
    id: `log-flag-${s.logEvents.length + 1}`,
    at,
    agentId: c.agentId,
    text: `Flagged for SOP: line ${line} · ${l.agent ? word(l.agent) : 'missing'} → ${theirs.charAt(0).toLowerCase()}${theirs.slice(1)}`,
    sub: `${personName(s, agent?.techOwnerId)} is asked to check the SOP mapping · ${personName(s, by)}`,
  })
  return s
}

/** The latest version of a privilege by its code ("prv-0142"): the highest one still in force, else the highest. */
export const latestByCode = (s: DemoState, code: string) => {
  const versions = s.privileges.filter((p) => p.code.toLowerCase() === code.toLowerCase()).sort((a, b) => b.version - a.version)
  return versions.find((p) => p.state !== 'closed') ?? versions[0]
}

/** What signing this privilege would do now: sign a proposal, renew a due one, or nothing. */
export function signMode(s: DemoState, code: string): 'sign' | 'renew' | null {
  const p = latestByCode(s, code)
  if (!p) return null
  if (p.state === 'awaiting' && p.proposedLevel) return 'sign'
  if (p.state === 'due' || p.state === 'lapsed' || (p.state === 'active' && p.reviewDate && p.reviewDate < s.now && p.level !== 'shadow')) return 'renew'
  return null
}

const LEVELS: Array<'shadow' | 'draft' | 'supervised' | 'autonomous'> = ['shadow', 'draft', 'supervised', 'autonomous']

/** The review date for a privilege signed at `at`: the tier's cycle counted from the day after (R12). */
export const reviewDateFrom = (at: string, tier: Tier) => `${addDays(at, TIER_RULES[tier].reviewDays + 1).slice(0, 10)}T00:00:00`

/** The sponsor signs (3c): the proposal goes live at its level; or a due privilege is renewed (3d). */
export function applySignPrivilege(s: DemoState, code: string, input: { reason?: string }, by: string, at: string): DemoState {
  const latest = latestByCode(s, code)
  const mode = signMode(s, code)
  const agent = s.agents.find((a) => a.id === latest?.agentId)
  const activity = s.activities.find((a) => a.id === latest?.activityId)
  if (!latest || !mode || !agent || !activity) return s
  const reviewDate = reviewDateFrom(at, agent.riskTier)
  if (mode === 'sign') {
    const level = latest.proposedLevel!
    for (const p of s.privileges) if (p.code === latest.code && p.version < latest.version && p.state !== 'closed') p.state = 'closed'
    const card = s.scorecards.find((c) => c.activityId === activity.id)
    const criteria = criteriaStatus(s, activity.id)
    const days = card ? Math.round((Date.parse(card.to) - Date.parse(card.from)) / 86400000) + 1 : 0
    Object.assign(latest, {
      state: 'active',
      level,
      grantedBy: by,
      grantedAt: at,
      reviewDate,
      evidence: card ? `${days}-day shadow · ${card.cases.toLocaleString('en-US')} cases · ${criteria.filter((c) => c.met).length} of ${criteria.length} targets met` : latest.evidence,
      ...(input.reason ? { signReason: input.reason } : {}),
    })
    delete latest.proposedLevel
    activity.level = level
    const levels = s.activities.filter((a) => a.agentId === agent.id).map((a) => LEVELS.indexOf(a.level))
    agent.level = LEVELS[Math.max(...levels)]!
    if (agent.judgment.status === 'shadow') agent.judgment = { status: 'normal', label: 'Within scope' }
    agent.reviewDate = reviewDate
    resolveItems(s, agent.id, 'Review: your signature', by, at, 'Signed')
    recordOfActivity(s, activity.id)?.history.push({ at, by, text: `${personName(s, by)} · signed ${latest.code} v${latest.version}`, sub: `Shadow → ${level.charAt(0).toUpperCase()}${level.slice(1)}${input.reason ? ' · below target, reason recorded' : ''}`, decision: true })
    return s
  }
  // Renewal: a new version at the same level, reviewed again a full cycle from now. A lapsed
  // privilege (8a) is re-signed the same way, and its activity returns to the signed level.
  const version = nextVersion(s, latest.code)
  const lapsed = latest.state === 'lapsed'
  latest.state = 'closed'
  const renewed: Privilege = { ...latest, id: `${latest.code.toLowerCase()}-v${version}`, version, state: 'active', grantedBy: by, grantedAt: at, reviewDate, ...(input.reason ? { signReason: input.reason } : {}) }
  delete renewed.lapsedAt
  if (lapsed) {
    delete renewed.movedBy
    delete renewed.trigger
  }
  s.privileges.push(renewed)
  if (lapsed) {
    activity.level = latest.level
    const levels = s.activities.filter((a) => a.agentId === agent.id).map((a) => LEVELS.indexOf(a.level))
    agent.level = LEVELS[Math.max(...levels)]!
  }
  if (agent.level === latest.level) agent.reviewDate = reviewDate
  for (const e of s.exceptions)
    if (e.agentId === agent.id && e.type === 'Review overdue' && e.ruleTag === latest.code && e.state !== 'resolved' && e.state !== 'dismissed')
      Object.assign(e, { state: 'resolved', outcome: `Renewed · ${latest.code} v${version}`, closedAt: at, closedBy: by })
  return s
}

/** The sponsor sends a go-live request back to the owner with a note (3c "Request changes"). */
export function applyReturnRequest(s: DemoState, code: string, note: string, by: string, at: string): DemoState {
  const latest = latestByCode(s, code)
  const agent = s.agents.find((a) => a.id === latest?.agentId)
  if (!latest || !agent || latest.state !== 'awaiting' || !latest.proposedLevel) return s
  latest.state = 'closed'
  resolveItems(s, agent.id, 'Review: your signature', by, at, 'Sent back')
  raiseItem(s, {
    agentId: agent.id,
    type: 'Returned: go-live request',
    reason: note,
    action: 'answer before asking again',
    actionSub: `${personName(s, by)} sent ${latest.code} v${latest.version} back`,
    ownerId: agent.ownerId,
    copied: [by],
    link: { label: 'Open the scorecard', to: `/operations/agents/${agent.id}?tab=scorecard&activity=${latest.activityId}` },
    at,
  })
  recordOfActivity(s, latest.activityId)?.history.push({ at, by, text: `${personName(s, by)} · sent the go-live request back`, sub: note, decision: true })
  return s
}

/** The sponsor asks the owner for evidence before a review (3d "Ask Marcus for evidence"). */
export function applyAskEvidence(s: DemoState, code: string, by: string, at: string): DemoState {
  const latest = latestByCode(s, code)
  const agent = s.agents.find((a) => a.id === latest?.agentId)
  if (!latest || !agent) return s
  raiseItem(s, {
    agentId: agent.id,
    type: `Evidence for the ${latest.code} review`,
    reason: `${personName(s, by)} asks for evidence before reviewing ${latest.code} v${latest.version}.`,
    action: 'send the evidence',
    actionSub: latest.evidence,
    ownerId: agent.ownerId,
    copied: [by],
    link: { label: 'Open the privileges', to: `/operations/agents/${agent.id}?tab=privileges` },
    at,
  })
  return s
}
