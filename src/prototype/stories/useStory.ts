import { useEffect, useEffectEvent, useMemo } from 'react'
import { useNavigate, useSearchParams, type SetURLSearchParams } from 'react-router'
import { useDemo } from '../../store'
import { applyStep } from './apply'
import { stepHref, urlAction } from './engine'
import { STORIES, storyById } from './index'
import { useStory } from './progress'
import type { Story, StoryId, StoryProgress } from './types'

/** The story being followed, if any. */
export function useActiveStory(
  stories: readonly Story[] = STORIES,
): { story: Story; progress: StoryProgress } | null {
  const progress = useStory((s) => s.progress)
  const story = progress ? storyById(progress.storyId, stories) : undefined
  return story && progress ? { story, progress } : null
}

function setStoryParams(setParams: SetURLSearchParams, storyId: StoryId | null, step?: number) {
  setParams(
    (prev) => {
      const next = new URLSearchParams(prev)
      if (storyId === null) {
        next.delete('story')
        next.delete('step')
      } else {
        next.set('story', storyId)
        next.set('step', String(step))
      }
      return next
    },
    { replace: true },
  )
}

/** Start, move through and leave a story. Each opens the step's state first, then navigates. */
export function useStoryActions(stories: readonly Story[] = STORIES) {
  const navigate = useNavigate()
  const [, setParams] = useSearchParams()
  return useMemo(() => {
    const open = (story: Story, step: number, fresh: boolean) => {
      const progress = applyStep(useDemo, useStory, story, step, fresh)
      navigate(stepHref(story, progress.step))
    }
    return {
      /** From step 1, loading the story's scenario even if it was already being followed. */
      start: (id: StoryId) => {
        const story = storyById(id, stories)
        if (story) open(story, 1, true)
      },
      /** Another step of the active story, or the current one ("Return to it"). */
      go: (step: number) => {
        const progress = useStory.getState().progress
        const story = progress ? storyById(progress.storyId, stories) : undefined
        if (story) open(story, step, false)
      },
      /** Leave the story where you are; the data stays as it is. */
      exit: () => {
        useStory.getState().setProgress(null)
        setStoryParams(setParams, null)
      },
    }
  }, [navigate, setParams, stories])
}

/**
 * Keep `?story=&step=` and the saved progress in step (R3). Runs when those params change: a link
 * opens its step, a product link that dropped them gets them back, a bad link is cleaned up.
 */
export function useStoryUrlSync(stories: readonly Story[] = STORIES) {
  const [params, setParams] = useSearchParams()
  const storyParam = params.get('story')
  const stepParam = params.get('step')
  const sync = useEffectEvent(() => {
    const action = urlAction(params, useStory.getState().progress, stories)
    if (action.kind === 'strip') setStoryParams(setParams, null)
    if (action.kind === 'append' || action.kind === 'rewrite')
      setStoryParams(setParams, action.storyId, action.step)
    if (action.kind === 'open') {
      applyStep(useDemo, useStory, storyById(action.storyId, stories)!, action.step, false)
      if (action.rewrite) setStoryParams(setParams, action.storyId, action.step)
    }
  })
  useEffect(() => {
    sync()
  }, [storyParam, stepParam])
}
