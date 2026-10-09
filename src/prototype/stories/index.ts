import { ana } from './ana'
import { dana } from './dana'
import { drlee } from './drlee'
import { jordan } from './jordan'
import { marcus } from './marcus'
import { priya } from './priya'
import { sam } from './sam'
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
export const STORIES: readonly Story[] = [marcus, priya, dana, sam, drlee, ana, jordan]

export function storyById(
  id: string | null,
  stories: readonly Story[] = STORIES,
): Story | undefined {
  return stories.find((s) => s.id === id)
}
