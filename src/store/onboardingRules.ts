import { JOB_TEMPLATES, type JobTemplate } from '../data/seed/catalogue'
import type { DemoState, IntakeRequest, Onboarding, OnboardingGrant, Verb } from '../data/types'
import { formatDate } from '../lib/clock'

/**
 * Pure onboarding rules: what's done, what's missing, whose turn it is. The wizard rail, side
 * panels, the Drafts tab and the store's gates all read these, so they always agree. They live
 * in the store layer because store actions gate on them (ruling: store must not import features).
 */

export type StepId = 'intake' | 'job' | 'systems' | 'tools' | 'approval' | 'review'
export type JobFieldId = 'purpose' | 'activities' | 'never' | 'actingFor' | 'escalation' | 'criteria' | 'domain'
/** Same values as the WizardSteps primitive's marks. */
export type Mark = 'done' | 'todo' | 'locked' | 'review' | 'none'

export const STEP_NAMES: Record<StepId, string> = {
  intake: 'Intake',
  job: 'Job description',
  systems: 'Systems and verbs',
  tools: 'Tools and hard stops',
  approval: 'Sponsor approval',
  review: 'Ready for review',
}
export const STEP_ORDER: StepId[] = ['intake', 'job', 'systems', 'tools', 'approval', 'review']

const FIELD_NAMES: Record<JobFieldId, string> = {
  purpose: 'Purpose',
  activities: 'Activities',
  never: 'Never list',
  actingFor: 'Acting for',
  escalation: 'Escalation triggers',
  criteria: 'Success criteria',
  domain: 'Rollout domain',
}

const VERBS: Verb[] = ['read', 'draft', 'write', 'submit', 'sign', 'order']

const EMPTY_TEMPLATE: JobTemplate = {
  build: { version: 'v0.1.0', platform: 'Epic' },
  actingForOptions: [],
  suggestionsLabel: '',
  escalationSuggestions: [],
  criteria: [],
  systems: [],
  testSample: 1000,
  expectedActivities: 1,
  conditions: [],
}

export const templateFor = (intake: IntakeRequest | undefined): JobTemplate => (intake && JOB_TEMPLATES[intake.id]) || EMPTY_TEMPLATE

/** Everything the rules need about one agent being onboarded, whether or not it has started. */
export function onboardingContext(s: DemoState, agentId: string) {
  const record = s.onboardings.find((r) => r.agentId === agentId) ?? null
  const intake = s.intakeRequests.find((r) => r.agentId === agentId) ?? s.intakeRequests.find((r) => r.id === record?.intakeId)
  const agent = s.agents.find((a) => a.id === agentId)
  const divisionId = agent?.divisionId ?? intake?.divisionId
  const division = s.divisions.find((d) => d.id === divisionId)
  const holder = (role: string) => s.roles.find((r) => r.role === role && (r.divisionId === divisionId || r.divisionId === 'all'))?.personId
  const people = {
    lead: holder('programLead') ?? 'dana',
    owner: agent?.ownerId ?? division?.ownerId ?? '',
    tech: agent?.techOwnerId ?? holder('techOwner') ?? '',
    sponsor: agent?.sponsorId ?? intake?.sponsorId ?? division?.sponsorId ?? '',
  }
  return { record, intake, agent, template: templateFor(intake), people }
}

export const personName = (s: DemoState, id: string | undefined) => s.people.find((p) => p.id === id)?.name ?? id ?? ''

/** A read is covered by a write on the same system: it needs no reason and no tool of its own (1c, 1d). */
export function needsReason(grant: Pick<OnboardingGrant, 'system' | 'verb'>, grants: Pick<OnboardingGrant, 'system' | 'verb'>[]): boolean {
  return !(grant.verb === 'read' && grants.some((g) => g.system === grant.system && g.verb === 'write'))
}

/** The seven fields of the job description (1b side panel). */
export function jobFields(s: DemoState, agentId: string): { id: JobFieldId; label: string; done: boolean }[] {
  const { record, template } = onboardingContext(s, agentId)
  if (!record) return []
  const { job } = record
  const targets = template.criteria.map((c) => job.targets[c.id] ?? null)
  const set = targets.filter((t) => t !== null).length
  const criteriaDone = template.criteria.length > 0 && set === template.criteria.length
  return [
    { id: 'purpose', label: 'Purpose', done: job.purpose.trim().length > 0 },
    { id: 'activities', label: job.activities.length ? `Activities · ${job.activities.length}` : 'Activities', done: job.activities.length > 0 },
    // The ORG-POL-02 line is always on the list, so it counts.
    { id: 'never', label: job.never.length ? `Never list · ${job.never.length + 1}` : 'Never list', done: job.never.length > 0 },
    { id: 'actingFor', label: 'Acting for', done: Boolean(job.actingFor) },
    { id: 'escalation', label: 'Escalation triggers', done: job.escalation.length > 0 },
    {
      id: 'criteria',
      label: criteriaDone ? 'Success criteria' : `Success criteria · ${set} of ${template.criteria.length} targets`,
      done: criteriaDone,
    },
    { id: 'domain', label: 'Rollout domain', done: job.domain.units.length > 0 && Boolean(job.domain.patients) && Boolean(job.domain.hours) },
  ]
}

export function firstMissingField(s: DemoState, agentId: string): JobFieldId | null {
  return jobFields(s, agentId).find((f) => !f.done)?.id ?? null
}

/** The systems grid by row (1c): a row is done when every grant it holds names its activity. */
export function systemsProgress(s: DemoState, agentId: string) {
  const { record, template } = onboardingContext(s, agentId)
  const grants = record?.grants ?? []
  const rows = template.systems.map(({ system }) => {
    const mine = grants.filter((g) => g.system === system)
    const unused = mine.length === 0
    const done = !unused && mine.every((g) => !needsReason(g, grants) || g.activity !== null)
    const verbs = VERBS.filter((v) => mine.some((g) => g.verb === v)).join(', ')
    return { system, done, unused, summary: unused ? 'not used' : done ? verbs : 'choose activity' }
  })
  return {
    rows,
    done: rows.filter((r) => r.done).length,
    total: rows.length,
    started: grants.length > 0,
    complete: rows.some((r) => r.done) && rows.every((r) => r.done || r.unused),
  }
}

/** Hard stops tested and not sent back for another look. */
export function limitsProgress(record: Onboarding) {
  return { tested: record.limits.filter((l) => l.test && !l.reopened).length, total: record.limits.length }
}

/** Items across the record: intake, the 7 job fields, systems, one per hard stop, and the sponsor (13 for Med Rec). */
export function recordItems(s: DemoState, agentId: string): { done: number; total: number } {
  const { record } = onboardingContext(s, agentId)
  if (!record) return { done: 0, total: 10 }
  const done =
    (record.done.intake ? 1 : 0) +
    jobFields(s, agentId).filter((f) => f.done).length +
    (systemsProgress(s, agentId).complete ? 1 : 0) +
    limitsProgress(record).tested +
    (record.sponsor.state === 'signed' ? 1 : 0)
  return { done, total: 10 + record.limits.length }
}

/** Everything but the sponsor's approval is done: the set can go to the sponsor. */
export const readyToSend = (s: DemoState, agentId: string) => {
  const items = recordItems(s, agentId)
  return items.done === items.total - 1
}

const SHORT_SYSTEM: Record<string, string> = { 'Microsoft Teams': 'Teams', 'Pharmacy worklist': 'worklist' }

/** The six E1 steps with their marks and lines (1a–1h rails). */
export function stepStates(s: DemoState, agentId: string): { id: StepId; number: number; name: string; label: string; sub: string; mark: Mark; owner: string }[] {
  const { record, people } = onboardingContext(s, agentId)
  const name = (id: string) => personName(s, id)
  const lead = name(people.lead)
  const owner = name(people.owner)
  const tech = name(people.tech)
  const sponsor = name(people.sponsor)
  const step = (id: StepId, sub: string, mark: Mark, who: string) => {
    const number = STEP_ORDER.indexOf(id) + 1
    return { id, number, name: STEP_NAMES[id], label: `${number} · ${STEP_NAMES[id]}`, sub, mark, owner: who }
  }
  if (!record) {
    return [
      step('intake', `${lead} · ready to start`, 'todo', people.lead),
      step('job', `${owner} · after start`, 'none', people.owner),
      step('systems', `${owner} · after start`, 'none', people.owner),
      step('tools', `${tech} · after start`, 'none', people.tech),
      step('approval', sponsor, 'locked', people.sponsor),
      step('review', 'AIMS Review', 'none', ''),
    ]
  }
  const fields = jobFields(s, agentId)
  const jobDone = fields.every((f) => f.done)
  const systems = systemsProgress(s, agentId)
  const limits = limitsProgress(record)
  const { sponsor: review } = record
  const starter = name(record.done.intake?.by ?? record.startedBy)

  const tools = (() => {
    if (review.state === 'returned' && review.returned?.to === people.tech) return step('tools', `${tech} · returned ${formatDate(review.returned.at)}`, 'todo', people.tech)
    if (record.done.tools && (review.state === 'waiting' || review.state === 'signed')) return step('tools', `${tech} · done ${formatDate(record.done.tools.at)}`, 'done', people.tech)
    const all = limits.total > 0 && limits.tested === limits.total
    return step('tools', `${tech} · ${limits.tested} of ${limits.total}${all ? ' tested' : ''}`, 'todo', people.tech)
  })()

  const approval = (() => {
    if (review.state === 'signed') return step('approval', `${sponsor} · signed ${formatDate(review.signedAt!)}`, 'done', people.sponsor)
    if (review.state === 'waiting') return step('approval', `${sponsor} · waiting since ${formatDate(review.sentAt!)}`, 'review', people.sponsor)
    if (review.round > 0) return step('approval', `${sponsor} · reset, opens when you send`, 'locked', people.sponsor)
    if (readyToSend(s, agentId)) return step('approval', `${sponsor} · opens when you send`, 'locked', people.sponsor)
    return step('approval', `${sponsor} · opens when 2–4 are done`, 'locked', people.sponsor)
  })()

  return [
    step('intake', `${starter} · done ${formatDate(record.done.intake?.at ?? record.startedAt)}`, 'done', people.lead),
    jobDone
      ? step('job', `${owner} · done ${formatDate(record.done.job?.at ?? record.savedAt)}`, 'done', people.owner)
      : step('job', `${owner} · ${fields.filter((f) => f.done).length} of 7`, 'todo', people.owner),
    systems.complete
      ? step('systems', `${owner} · done ${formatDate(record.done.systems?.at ?? record.savedAt)}`, 'done', people.owner)
      : step('systems', systems.started ? `${owner} · ${systems.done} of ${systems.total}` : `${owner} · not started`, 'todo', people.owner),
    tools,
    approval,
    review.state === 'signed'
      ? step('review', `AIMS Review · since ${formatDate(review.signedAt!)}`, 'done', '')
      : step('review', 'AIMS Review', 'none', ''),
  ]
}

/** The first step with work left, what's missing there, and whose turn it is (1b blocked line, 1i rows). */
export function openStep(s: DemoState, agentId: string): { step: StepId; number: number; name: string; missing: string[]; waitingOn: string } | null {
  const { record, intake, template, people } = onboardingContext(s, agentId)
  const at = (step: StepId, missing: string[], waitingOn: string) => ({ step, number: STEP_ORDER.indexOf(step) + 1, name: STEP_NAMES[step], missing, waitingOn })
  if (!record) return intake && !intake.startedAt ? at('intake', ['Approved, not started'], people.lead) : null
  if (record.sponsor.state === 'signed') return null

  const fields = jobFields(s, agentId)
  if (fields.some((f) => !f.done)) {
    const missing = fields.flatMap((f) => {
      if (f.done) return []
      if (f.id !== 'criteria') return [FIELD_NAMES[f.id]]
      const open = template.criteria.filter((c) => (record.job.targets[c.id] ?? null) === null)
      return open.length === template.criteria.length ? [FIELD_NAMES.criteria] : open.map((c) => `${c.short} target`)
    })
    return at('job', missing, people.owner)
  }
  const systems = systemsProgress(s, agentId)
  if (!systems.complete) {
    const unexplained = record.grants.filter((g) => needsReason(g, record.grants) && g.activity === null)
    const missing = unexplained.length ? unexplained.map((g) => `${SHORT_SYSTEM[g.system] ?? g.system} · ${g.verb} needs its activity`) : [STEP_NAMES.systems]
    return at('systems', missing, people.owner)
  }
  const reopened = record.limits.filter((l) => l.reopened)
  const limits = limitsProgress(record)
  if (reopened.length) return at('tools', reopened.map((l) => `${l.code} re-test`), people.tech)
  if (limits.tested < limits.total) return at('tools', [`${limits.tested} of ${limits.total} hard stops tested`], people.tech)
  if (record.sponsor.state === 'waiting') return at('approval', ['Review: final set'], people.sponsor)
  return at('tools', [`Send to ${personName(s, people.sponsor)}`], people.tech)
}
