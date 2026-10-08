import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { buildScenario, type ScenarioId } from '../data/scenarios'
import { createSeed, SEED_VERSION } from '../data/seed'
import { PERSONA_IDS, type DemoState, type PersonaId } from '../data/types'
import { formatClock } from '../lib/clock'
import { runAction, type ActionResult } from './runAction'
import { safeStorage } from './storage'

export type { ActionResult } from './runAction'

/** Why an exception was dismissed (5b); the category tunes the rule that raised it. */
export type DismissCategory = 'expected' | 'duplicate' | 'noisy' | 'other'

export const DISMISS_LABELS: Record<DismissCategory, string> = {
  expected: 'Expected change',
  duplicate: 'Duplicate',
  noisy: 'Rule is too noisy',
  other: 'Other',
}

export interface DismissInput {
  category: DismissCategory
  reason: string
  /** A rule change to propose alongside, e.g. "Raise the MR-12 threshold … until 11 Dec". */
  tune?: string
}

export interface DemoActions {
  setPersona: (id: PersonaId) => void
  /** Restore the seed: data, clock and persona. */
  reset: () => void
  /** Replace the data with a named scenario, keeping who you are viewing as. */
  loadScenario: (id: ScenarioId) => void
  /** Take ownership of an exception (state → claimed, stamped with the demo clock). */
  claimException: (id: string) => ActionResult
  /** Hide an exception from the inbox until `until`; the deadline still stands. */
  snoozeException: (id: string, until: string) => ActionResult
  /** Close an exception without acting on it. A reason is required; it is logged. */
  dismissException: (id: string, input: DismissInput) => ActionResult
  /** Hand an exception to someone else; the previous owner and you stay copied. */
  assignException: (id: string, personId: string) => ActionResult
  /** Answer a question from a person (5a): closes it with the answer. */
  answerQuestion: (id: string, answer: 'yes' | 'no') => ActionResult
}

export type DemoStore = DemoState & DemoActions

const DATA_KEYS = Object.keys(createSeed()) as Array<keyof DemoState>

/**
 * Saved state is used only if it is a full snapshot of the current seed version with a known
 * persona; anything else (no version, missing collections, a stray persona) starts from the seed.
 */
function isCurrentSnapshot(saved: unknown): saved is DemoState {
  if (!saved || typeof saved !== 'object') return false
  const s = saved as Record<string, unknown>
  const seed = createSeed() as unknown as Record<string, unknown>
  return (
    s.version === SEED_VERSION &&
    PERSONA_IDS.includes(s.personaId as PersonaId) &&
    DATA_KEYS.every((key) => typeof s[key] === typeof seed[key] && Array.isArray(s[key]) === Array.isArray(seed[key]))
  )
}

/** Just the data, without the action functions. */
export function dataOf(store: DemoState): DemoState {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, store[key]])) as unknown as DemoState
}

/** A demo store persisted to `storage` under a versioned key. Tests pass their own storage. */
export function createDemoStore(storage: StateStorage = safeStorage) {
  return create<DemoStore>()(
    persist<DemoStore, [], [], DemoState>(
      (set, get) => {
        const act = (spec: Parameters<typeof runAction>[1]): ActionResult => {
          const { state, result } = runAction(dataOf(get()), spec)
          if (result.ok) set(state)
          return result
        }
        /** An open exception, or the reason it can't be acted on. */
        const openException = (id: string) => {
          const exception = get().exceptions.find((e) => e.id === id)
          if (!exception) return { error: { ok: false, reason: 'Not found' } as ActionResult }
          if (exception.state === 'resolved' || exception.state === 'dismissed') return { error: { ok: false, reason: 'Already resolved' } as ActionResult }
          return { exception }
        }
        return {
          ...createSeed(),
          setPersona: (id) => set({ personaId: id }),
          reset: () => set(createSeed()),
          loadScenario: (id) => set({ ...buildScenario(id), personaId: get().personaId }),
          claimException: (id) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            if (exception.claimedAt) return { ok: false, reason: 'Already claimed' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Claimed', target: exception.code },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                target.claimedAt = draft.now
                target.ownerId = draft.personaId
                if (target.state === 'new') target.state = 'claimed'
              },
            })
          },
          snoozeException: (id, until) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Snoozed', target: exception.code, reason: `until ${formatClock(until)}` },
              mutate: (draft) => {
                draft.exceptions.find((e) => e.id === id)!.snoozedUntil = until
              },
            })
          },
          assignException: (id, personId) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            const person = get().people.find((p) => p.id === personId)
            if (!person) return { ok: false, reason: 'Unknown person' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Assigned', target: exception.code, reason: `to ${person.name}` },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                const keep = [target.ownerId, draft.personaId].filter((p) => p !== personId)
                target.copied = [...new Set([...target.copied.filter((p) => p !== personId), ...keep])]
                target.ownerId = personId
                target.assignedAt = draft.now
              },
            })
          },
          answerQuestion: (id, answer) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            if (exception.kind !== 'question') return { ok: false, reason: 'Not a question' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Answered', target: exception.code, reason: answer === 'yes' ? 'Yes' : 'No' },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                Object.assign(target, { state: 'resolved', outcome: `Answered ${answer}`, closedAt: draft.now, closedBy: draft.personaId })
              },
            })
          },
          dismissException: (id, { category, reason, tune }) => {
            const { exception, error } = openException(id)
            if (!exception) return error
            const why = reason.trim()
            if (!why) return { ok: false, reason: 'A reason is required' }
            return act({
              action: 'resolveException',
              ctx: { agentId: exception.agentId },
              audit: { action: 'Dismissed', target: exception.code, reason: `${DISMISS_LABELS[category]} · ${why}` },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                target.state = 'dismissed'
                target.dismissReason = why
                target.closedAt = draft.now
                target.closedBy = draft.personaId
                if (!tune) return
                const agent = draft.agents.find((a) => a.id === exception.agentId)
                const name = (personId?: string) => draft.people.find((p) => p.id === personId)?.name ?? 'the technical owner'
                draft.logEvents.push({
                  id: `log-tune-${draft.logEvents.length + 1}`,
                  at: draft.now,
                  agentId: exception.agentId,
                  text: tune,
                  sub: `Requested by ${name(draft.personaId)} · ${name(agent?.techOwnerId)} is asked to confirm`,
                })
              },
            })
          },
        }
      },
      {
        name: 'acp-demo',
        version: SEED_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: dataOf,
        // Any saved state from another seed version is replaced by a fresh seed (Review focus 1).
        migrate: () => createSeed(),
        merge: (saved, current) => (isCurrentSnapshot(saved) ? { ...current, ...saved } : current),
      },
    ),
  )
}

/** The app's store. */
export const useDemo = createDemoStore()
