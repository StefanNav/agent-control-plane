import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { createSeed, SEED_VERSION } from '../data/seed'
import type { DemoState, PersonaId } from '../data/types'
import { runAction, type ActionResult } from './runAction'
import { safeStorage } from './storage'

export type { ActionResult } from './runAction'

export interface DemoActions {
  setPersona: (id: PersonaId) => void
  /** Restore the seed: data, clock and persona. */
  reset: () => void
  /** Take ownership of an exception (state → claimed, stamped with the demo clock). */
  claimException: (id: string) => ActionResult
}

export type DemoStore = DemoState & DemoActions

const DATA_KEYS = Object.keys(createSeed()) as Array<keyof DemoState>

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
        return {
          ...createSeed(),
          setPersona: (id) => set({ personaId: id }),
          reset: () => set(createSeed()),
          claimException: (id) => {
            const exception = get().exceptions.find((e) => e.id === id)
            if (!exception) return { ok: false, reason: 'Not found' }
            const agent = get().agents.find((a) => a.id === exception.agentId)
            return act({
              action: 'resolveException',
              ctx: { divisionId: agent?.divisionId },
              audit: { action: 'Claimed', target: exception.code },
              mutate: (draft) => {
                const target = draft.exceptions.find((e) => e.id === id)!
                target.claimedAt = draft.now
                if (target.state === 'new') target.state = 'claimed'
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
      },
    ),
  )
}

/** The app's store. */
export const useDemo = createDemoStore()
