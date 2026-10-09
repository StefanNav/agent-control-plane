import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import {
  clampStep,
  onStepRoute,
  openStep,
  scenarioAt,
  stepHref,
  urlAction,
  validProgress,
} from './engine'
import { FIXTURE_STORY } from '../../test/storyFixture'
import type { StoryProgress } from './types'

const story = FIXTURE_STORY
const stories = [story]
const at = (step: number, loaded: StoryProgress['loaded'] = 'baseline'): StoryProgress => ({
  storyId: 'marcus',
  step,
  loaded,
})

describe('clampStep', () => {
  test('keeps a step inside the story', () => {
    expect(clampStep(story, 0)).toBe(1)
    expect(clampStep(story, -4)).toBe(1)
    expect(clampStep(story, Number.NaN)).toBe(1)
    expect(clampStep(story, 2.7)).toBe(2)
    expect(clampStep(story, 99)).toBe(3)
  })
})

test('a patch holds for the steps after it', () => {
  expect([1, 2, 3].map((n) => scenarioAt(story, n))).toEqual([
    'baseline',
    'baseline',
    'med-rec-paused',
  ])
})

test('stepHref keeps the route’s own query', () => {
  expect(stepHref(story, 1)).toBe('/operations?story=marcus&step=1')
  expect(stepHref(story, 2)).toBe('/operations/agents/med-rec?tab=scorecard&story=marcus&step=2')
})

test('onStepRoute compares the path only', () => {
  expect(onStepRoute(story.steps[1]!, '/operations/agents/med-rec')).toBe(true)
  expect(onStepRoute(story.steps[1]!, '/operations')).toBe(false)
})

describe('openStep (R2)', () => {
  const seed = createSeed()

  test('a fresh start loads the step’s scenario', () => {
    expect(openStep(null, story, 2, seed)).toEqual({ progress: at(2), load: 'baseline' })
  })

  test('progress from another story counts as fresh', () => {
    const other: StoryProgress = { storyId: 'priya', step: 4, loaded: 'resume-requested' }
    expect(openStep(other, story, 3, seed)).toEqual({
      progress: at(3, 'med-rec-paused'),
      load: 'med-rec-paused',
    })
  })

  test('steps that share a scenario keep the visitor’s changes', () => {
    expect(openStep(at(1), story, 2, seed)).toEqual({ progress: at(2), load: null })
  })

  test('the same step (a refresh) loads nothing', () => {
    expect(openStep(at(2), story, 2, seed).load).toBeNull()
  })

  test('crossing a patch forward loads it', () => {
    expect(openStep(at(2), story, 3, seed)).toEqual({
      progress: at(3, 'med-rec-paused'),
      load: 'med-rec-paused',
    })
  })

  test('keep accepts the visitor’s own equivalent action', () => {
    expect(openStep(at(2), story, 3, buildScenario('med-rec-paused'))).toEqual({
      progress: at(3, 'med-rec-paused'),
      load: null,
    })
  })

  test('going back across a patch loads the earlier scenario', () => {
    expect(openStep(at(3, 'med-rec-paused'), story, 2, seed)).toEqual({
      progress: at(2),
      load: 'baseline',
    })
  })

  test('the step is clamped', () => {
    expect(openStep(null, story, 42, seed).progress.step).toBe(3)
  })
})

describe('urlAction (R3, Review focus 4)', () => {
  const action = (search: string, progress: StoryProgress | null = null) =>
    urlAction(new URLSearchParams(search), progress, stories)

  test('nothing to do without a story anywhere', () => {
    expect(action('')).toEqual({ kind: 'none' })
  })

  test('a product link dropped the params: add them back', () => {
    expect(action('tab=changes', at(2))).toEqual({ kind: 'append', storyId: 'marcus', step: 2 })
  })

  test('an unknown story is ignored and stripped', () => {
    expect(action('story=nope&step=2')).toEqual({ kind: 'strip' })
    expect(action('story=nope', at(2))).toEqual({ kind: 'strip' })
  })

  test('an out-of-range or missing step is clamped and rewritten', () => {
    expect(action('story=marcus&step=99')).toEqual({
      kind: 'open',
      storyId: 'marcus',
      step: 3,
      rewrite: true,
    })
    expect(action('story=marcus&step=abc')).toEqual({
      kind: 'open',
      storyId: 'marcus',
      step: 1,
      rewrite: true,
    })
    expect(action('story=marcus')).toEqual({
      kind: 'open',
      storyId: 'marcus',
      step: 1,
      rewrite: true,
    })
  })

  test('a link to another step opens it', () => {
    expect(action('story=marcus&step=3', at(2))).toEqual({
      kind: 'open',
      storyId: 'marcus',
      step: 3,
      rewrite: false,
    })
  })

  test('after Exit, Back to a story link is ignored and stripped, not restarted', () => {
    expect(urlAction(new URLSearchParams('story=marcus&step=2'), null, stories, true)).toEqual({
      kind: 'strip',
    })
    // A link in a fresh tab (nothing exited) still opens.
    expect(urlAction(new URLSearchParams('story=marcus&step=2'), null, stories, false)).toEqual({
      kind: 'open',
      storyId: 'marcus',
      step: 2,
      rewrite: false,
    })
  })

  test('the URL already matches progress', () => {
    expect(action('story=marcus&step=2', at(2))).toEqual({ kind: 'none' })
    expect(action('story=marcus&step=02', at(2))).toEqual({
      kind: 'rewrite',
      storyId: 'marcus',
      step: 2,
    })
  })
})

describe('validProgress (R4, Review focus 4)', () => {
  test('a good value round-trips', () => {
    expect(validProgress(at(2), stories)).toEqual(at(2))
  })

  test('anything stale or malformed is dropped', () => {
    for (const value of [
      { storyId: 'nope', step: 1, loaded: 'baseline' },
      { storyId: 'marcus', step: 0, loaded: 'baseline' },
      { storyId: 'marcus', step: 4, loaded: 'baseline' },
      { storyId: 'marcus', step: 1.5, loaded: 'baseline' },
      { storyId: 'marcus', step: 1, loaded: 'removed-scenario' },
      null,
      'marcus',
    ]) {
      expect(validProgress(value, stories)).toBeNull()
    }
  })
})
