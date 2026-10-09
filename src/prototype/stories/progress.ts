import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { safeStorage } from '../../store/storage'
import { validProgress } from './engine'
import { STORIES } from './index'
import type { Story, StoryProgress } from './types'

export interface StoryStore {
  progress: StoryProgress | null
  setProgress: (progress: StoryProgress | null) => void
}

/**
 * Story progress, kept apart from the hospital's data (R4): a refresh reads it, so it never reloads
 * a scenario over the visitor's own changes. Saved progress that no longer fits is dropped.
 */
export function createStoryStore(
  storage: StateStorage = safeStorage,
  stories: readonly Story[] = STORIES,
) {
  return create<StoryStore>()(
    persist(
      (set) => ({
        progress: null,
        setProgress: (progress) => set({ progress }),
      }),
      {
        name: 'acp-story',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (s) => ({ progress: s.progress }),
        migrate: () => ({ progress: null }),
        merge: (saved, current) => ({
          ...current,
          progress: validProgress((saved as { progress?: unknown } | undefined)?.progress, stories),
        }),
      },
    ),
  )
}

/** The app's story progress. */
export const useStory = createStoryStore()
