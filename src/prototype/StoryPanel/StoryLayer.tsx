import { useActiveStory, useStoryUrlSync } from '../stories/useStory'
import { useTourOpen } from '../tour/useTour'
import { StoryPanel } from './StoryPanel'

/** The story layer of the app and prototype shells; the tour replaces it while it runs (spec §4.1). */
export function StoryLayer() {
  const tourOpen = useTourOpen()
  return tourOpen ? null : <Stories />
}

/** URL sync plus the narration panel. */
function Stories() {
  useStoryUrlSync()
  const active = useActiveStory()
  // A new story starts with the panel shown, even if the last one was hidden.
  return <StoryPanel key={active?.story.id ?? 'none'} />
}
