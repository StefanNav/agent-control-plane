import { agentFromIntake } from '../data/seed/onboarding'
import type { DemoState } from '../data/types'
import { personName, templateFor } from './onboardingRules'

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
