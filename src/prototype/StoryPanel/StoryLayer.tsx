import { useActiveStory, useStoryUrlSync } from '../stories/useStory'
import { StoryPanel } from './StoryPanel'

/** The story layer of the app and prototype shells: URL sync plus the narration panel. */
export function StoryLayer() {
  useStoryUrlSync()
  const active = useActiveStory()
  // A new story starts with the panel shown, even if the last one was hidden.
  return <StoryPanel key={active?.story.id ?? 'none'} />
}
