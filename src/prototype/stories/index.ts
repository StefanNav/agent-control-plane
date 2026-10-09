import { dana } from './dana'
import { marcus } from './marcus'
import { priya } from './priya'
import type { Story } from './types'

export type { Step, Story, StoryId, StoryProgress } from './types'
export {
  clampStep,
  onStepRoute,
  openStep,
  scenarioAt,
  stepHref,
  urlAction,
  validProgress,
} from './engine'

/** Every story, in persona order (Marcus first). */
export const STORIES: readonly Story[] = [marcus, priya, dana]

export function storyById(
  id: string | null,
  stories: readonly Story[] = STORIES,
): Story | undefined {
  return stories.find((s) => s.id === id)
}
