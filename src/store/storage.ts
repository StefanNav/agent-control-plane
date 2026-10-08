import type { StateStorage } from 'zustand/middleware'

/** A StateStorage kept in memory (tests, and the fallback when localStorage is unavailable). */
export function createMemoryStorage(): StateStorage {
  const memory = new Map<string, string>()
  return {
    getItem: (name) => memory.get(name) ?? null,
    setItem: (name, value) => {
      memory.set(name, value)
    },
    removeItem: (name) => {
      memory.delete(name)
    },
  }
}

const fallback = createMemoryStorage()

function attempt<T>(fn: (storage: Storage) => T, onFail: () => T): T {
  try {
    return fn(globalThis.localStorage)
  } catch {
    return onFail()
  }
}

/**
 * localStorage when it works; memory when it throws (private mode, blocked site data).
 * The prototype then still runs, it just doesn't remember across reloads (Review focus 2).
 */
export const safeStorage: StateStorage = {
  getItem: (name) =>
    attempt(
      (storage) => storage.getItem(name),
      () => fallback.getItem(name) as string | null,
    ),
  setItem: (name, value) =>
    attempt(
      (storage) => storage.setItem(name, value),
      () => fallback.setItem(name, value),
    ),
  removeItem: (name) =>
    attempt(
      (storage) => storage.removeItem(name),
      () => fallback.removeItem(name),
    ),
}
