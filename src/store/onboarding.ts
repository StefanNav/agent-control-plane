import { HARD_STOP_LIBRARY } from '../data/seed/catalogue'
import { agentFromIntake } from '../data/seed/onboarding'
import type { DemoState, JobDraft, Limit, Onboarding } from '../data/types'
import { nextHardStopCode } from './mutations'
import { jobFields, onboardingContext, personName, templateFor } from './onboardingRules'

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
