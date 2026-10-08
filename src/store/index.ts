import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { buildScenario, type ScenarioId } from '../data/scenarios'
import { createSeed, SEED_VERSION } from '../data/seed'
import { PERSONA_IDS, type DemoState, type PersonaId } from '../data/types'
import { formatClock } from '../lib/clock'
import { runAction, type ActionResult } from './runAction'
import { safeStorage } from './storage'

export type { ActionResult } from './runAction'

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
