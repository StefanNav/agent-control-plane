import { HARD_STOP_LIBRARY } from '../data/seed/catalogue'
import { agentFromIntake } from '../data/seed/onboarding'
import type { AgentException, DemoState, JobDraft, Limit, Onboarding, Verb } from '../data/types'
import { addMinutes } from '../lib/clock'
import { nextExceptionCode, nextHardStopCode } from './mutations'
import { jobFields, onboardingContext, personName, systemsProgress, templateFor } from './onboardingRules'

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
  if (jobFields(s, agentId).every((f) => f.done)) record.done.job ??= { at, by }
  else delete record.done.job
  return s
}

/** 17:00 two days after `at`: the deadline for an onboarding hand-off. */
const handOffDeadline = (at: string) => `${addMinutes(at, 2 * 24 * 60).slice(0, 10)}T17:00:00`

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
