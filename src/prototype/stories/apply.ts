import { dataOf, type DemoStore } from '../../store'
import { openStep } from './engine'
import type { StoryStore } from './progress'
import type { Story, StoryProgress } from './types'

interface Stores<T> {
  getState(): T
}

/**
 * Open a step: load its scenario if it needs one (R2), switch to the story's persona, save
 * progress. `fresh` starts over, loading the scenario even within the same story.
 */
export function applyStep(demo: Stores<DemoStore>, stories: Stores<StoryStore>, story: Story, step: number, fresh: boolean): StoryProgress {
  const current = fresh ? null : stories.getState().progress
  const { progress, load } = openStep(current, story, step, dataOf(demo.getState()))
  if (load) demo.getState().loadScenario(load)
  if (demo.getState().personaId !== story.personaId) demo.getState().setPersona(story.personaId)
  stories.getState().setProgress(progress)
  return progress
}
