import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { safeStorage } from '../../store/storage'
import { validProgress } from './engine'
import { STORIES } from './index'
import type { Story, StoryProgress } from './types'

export interface StoryStore {
  progress: StoryProgress | null
  /** The visitor left a story on this page load (kept in memory only): Back won't restart it. */
  exited: boolean
  setProgress: (progress: StoryProgress | null) => void
  /** Leave the story: no progress, and story links reached by Back are ignored. */
  exit: () => void
  /** A story was started from the page: the panel takes focus once (memory only, Phase 9 R6). */
  focusPanel: boolean
  requestPanelFocus: () => void
  panelFocused: () => void
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
        exited: false,
        setProgress: (progress) => set(progress ? { progress, exited: false } : { progress }),
        exit: () => set({ progress: null, exited: true }),
        focusPanel: false,
        requestPanelFocus: () => set({ focusPanel: true }),
        panelFocused: () => set({ focusPanel: false }),
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
