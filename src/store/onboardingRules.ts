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

export const FIELD_NAMES: Record<JobFieldId, string> = {
  purpose: 'Purpose',
  activities: 'Activities',
  never: 'Never list',
  actingFor: 'Acting for',
  escalation: 'Escalation triggers',
  criteria: 'Success criteria',
  domain: 'Rollout domain',
}

/** Which job field each JobDraft key fills. */
export const JOB_KEY_FIELD: Record<string, JobFieldId> = {
  purpose: 'purpose',
  activities: 'activities',
  never: 'never',
  actingFor: 'actingFor',
  escalation: 'escalation',
  targets: 'criteria',
  domain: 'domain',
}

const VERBS: Verb[] = ['read', 'draft', 'write', 'submit', 'sign', 'order']

const EMPTY_TEMPLATE: JobTemplate = {
  build: { version: 'v0.1.0', platform: 'Epic' },
  actingForOptions: [],
  suggestionsLabel: '',
  escalationSuggestions: [],
  criteria: [],
  caseNoun: 'cases',
  compareLine: 'each draft compared with the reviewer’s final work',
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

  const returnedToOwner = review.state === 'returned' && review.returned?.to === people.owner
  return [
    step('intake', `${starter} · done ${formatDate(record.done.intake?.at ?? record.startedAt)}`, 'done', people.lead),
    returnedToOwner
      ? step('job', `${owner} · returned ${formatDate(review.returned!.at)}`, 'todo', people.owner)
      : jobDone
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
  if (record.sponsor.state === 'returned' && record.sponsor.returned?.to === people.owner)
    return at('job', [`Changes ${personName(s, people.sponsor)} asked for`], people.owner)

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

const REACH_NAME: Record<string, string> = { 'Pharmacy worklist': 'the worklist', 'Microsoft Teams': 'Teams' }
const listOf = (items: string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Reach in one line" (1c), the line the sponsor and the committee read; `short` is 2b's Reach finding. */
export function reachLine(grants: Pick<OnboardingGrant, 'system' | 'verb'>[]): { does: string; never: string; short: string } {
  const systemsWith = (verb: Verb) => [...new Set(grants.filter((g) => g.verb === verb).map((g) => g.system))]
  const name = (system: string) => REACH_NAME[system] ?? system
  const parts = [
    ['Reads', systemsWith('read')],
    ['Drafts in', systemsWith('draft')],
    ['Writes to', systemsWith('write')],
    ['Submits to', systemsWith('submit')],
  ] as const
  const does = parts.filter(([, s]) => s.length).map(([verb, s]) => `${verb} ${listOf(s.map(name))}.`).join(' ')
  const nowhere = (['submit', 'sign', 'order'] as const).filter((v) => !systemsWith(v).length)
  const words: Record<string, string> = { submit: 'submits', sign: 'signs', order: 'orders' }
  const never = nowhere.length ? `${capital(listOf(nowhere.map((v) => words[v]!)))} nowhere.` : ''
  const reads = systemsWith('read').length
  const drafts = systemsWith('draft')
  const short = [`Reads ${reads} ${reads === 1 ? 'system' : 'systems'}${drafts.length ? `, drafts in ${listOf(drafts.map(name))}` : ''}.`, never.replace(/\.$/, '')].join(' ')
  return { does, never, short }
}

/** "Change a dose" → "changing a dose" (2b findings). */
const gerund = (text: string) => {
  const [first = '', ...rest] = text.split(' ')
  const word = first.toLowerCase()
  const ing = word.endsWith('e') && !word.endsWith('ee') ? `${word.slice(0, -1)}ing` : `${word}ing`
  return [ing, ...rest].join(' ')
}

export type Effect = 'Raises' | 'Held down' | 'Lowers' | 'Neutral'

/** Risk factors suggested from the job description and the systems grid (2b), and the tier they suggest. */
export function riskFactors(s: DemoState, agentId: string): { rows: { factor: string; finding: string; from: string; effect: Effect }[]; suggested: 1 | 2 | 3 | 4 } {
  const { record, intake } = onboardingContext(s, agentId)
  const grants = record?.grants ?? []
  // Identity checks guard every draft; they aren't an adverse branch of the work.
  const adverse = (record?.limits ?? []).filter((l) => l.library !== 'PT-MATCH-01')
  const submits = [...new Set(grants.filter((g) => g.verb === 'submit').map((g) => g.system))]
  const drafts = grants.some((g) => g.verb === 'draft')
  const pharmacist = /pharmacist/i.test(record?.job.actingFor ?? '')
  const rows: { factor: string; finding: string; from: string; effect: Effect }[] = []
  if (intake?.patientImpact) rows.push({ factor: 'Patient impact', finding: intake.patientImpact, from: 'Job description · purpose', effect: 'Raises' })
  if (adverse.length) {
    const all = adverse.length === 1 ? 'Blocked at the gateway' : adverse.length === 2 ? 'Both blocked at the gateway' : 'All blocked at the gateway'
    rows.push({ factor: 'Adverse branches', finding: `${capital(adverse.map((l) => gerund(l.from)).join(', '))}. ${all}`, from: `Hard stops ${adverse.map((l) => l.code).join(', ')}`, effect: 'Held down' })
  }
  rows.push(
    submits.length
      ? { factor: 'Facing', finding: `Acts without review: submits to ${listOf(submits)}`, from: 'Systems grid · submits', effect: 'Raises' }
      : drafts
        ? { factor: 'Facing', finding: `Clinician-facing. ${pharmacist ? 'A pharmacist signs every draft before the chart' : 'A person reviews every draft before it is used'}`, from: 'Systems grid · draft only', effect: 'Lowers' }
        : { factor: 'Facing', finding: 'Internal: reads and flags only', from: 'Systems grid · read only', effect: 'Lowers' },
  )
  rows.push({ factor: 'Reach', finding: reachLine(grants).short, from: 'Systems grid', effect: submits.length ? 'Raises' : 'Lowers' })
  if (intake?.volume) rows.push({ factor: 'Volume', finding: intake.volume, from: 'Rollout domain', effect: 'Neutral' })
  const raises = rows.filter((r) => r.effect === 'Raises').length
  const lowers = rows.filter((r) => r.effect === 'Lowers').length
  const suggested = submits.length ? 4 : !intake?.patientImpact ? 1 : raises > lowers ? 3 : 2
  return { rows, suggested }
}

/** ['C1','C2','C3'] → "C1–C3"; ['C1','C3'] → "C1, C3" (2d, 8c, privilege cards). */
export function conditionRange(ids: string[]): string {
  const nums = ids.map((id) => Number(id.slice(1)))
  const contiguous = ids.length > 2 && ids.every((id) => /^C\d+$/.test(id)) && nums.every((n, i) => i === 0 || n === nums[i - 1]! + 1)
  return contiguous ? `${ids[0]}–${ids.at(-1)}` : ids.join(', ')
}

/** Whole calendar days from a's date to b's date. */
const calendarDays = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000)

/** The onboarding record an activity belongs to. */
export const recordOfActivity = (s: DemoState, activityId: string) => s.onboardings.find((r) => r.job.activities.some((a) => a.id === activityId))

/** Shadow so far for an activity (3a "day 21 of 21"): completed days against the minimum (plus any extension). */
export function shadowProgress(s: DemoState, activityId: string): { day: number; minimum: number; label: string; done: boolean; endsOn: string } | null {
  const review = recordOfActivity(s, activityId)?.review
  if (!review?.shadowFrom) return null
  const extended = s.scorecards.find((c) => c.activityId === activityId)?.extendedDays ?? 0
  const minimum = review.shadowDays + extended
  const day = Math.max(0, calendarDays(review.shadowFrom, s.now))
  const endDate = new Date(`${review.shadowFrom.slice(0, 10)}T12:00:00`)
  endDate.setDate(endDate.getDate() + minimum - 1)
  return {
    day,
    minimum,
    label: day > minimum ? `day ${day} · ${minimum}-day minimum met` : `day ${day} of ${minimum}`,
    done: day >= minimum,
    endsOn: formatDate(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T12:00:00`),
  }
}

/** Each success criterion against the activity's shadow results (3a, 3c): target, result and whether it's met. */
export function criteriaStatus(s: DemoState, activityId: string) {
  const record = recordOfActivity(s, activityId)
  const template = templateFor(s.intakeRequests.find((i) => i.id === record?.intakeId))
  const card = s.scorecards.find((c) => c.activityId === activityId)
  return template.criteria.map((c) => {
    const target = record?.job.targets[c.id] ?? null
    const result = card?.results[c.id]?.value ?? null
    const met = target !== null && result !== null && (c.direction === 'atLeast' ? result >= target : result <= target)
    return { ...c, target, result, trend: card?.results[c.id]?.trend ?? [], met }
  })
}
