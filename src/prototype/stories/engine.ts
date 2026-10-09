import { SCENARIO_IDS, type ScenarioId } from '../../data/scenarios'
import type { DemoState } from '../../data/types'
import type { Step, Story, StoryId, StoryProgress } from './types'

/** Any base works: routes are app-relative and we only read pathname and search back. */
const parse = (route: string) => new URL(route, 'http://story.local')

/** A step number inside the story: below 1 or not a number → 1, past the end → the last step. */
export function clampStep(story: Story, step: number): number {
  if (!Number.isFinite(step) || step < 1) return 1
  return Math.min(Math.floor(step), story.steps.length)
}

/** The scenario a step needs: the latest patch at or before it, else the story's own (R2). */
export function scenarioAt(story: Story, step: number): ScenarioId {
  for (let i = clampStep(story, step) - 1; i >= 0; i--) {
    const patch = story.steps[i]?.scenarioPatch
    if (patch) return patch
  }
  return story.scenarioId
}

/** The step's route with `story` and `step` set; the route's own query stays. */
export function stepHref(story: Story, step: number): string {
  const n = clampStep(story, step)
  const url = parse(story.steps[n - 1]!.route)
  url.searchParams.set('story', story.id)
  url.searchParams.set('step', String(n))
  return url.pathname + url.search
}

/** Is the visitor on the step's screen? Query differences (an open tab or dialog) don't count. */
export function onStepRoute(step: Step, pathname: string): boolean {
  return parse(step.route).pathname === pathname
}

/**
 * What opening `step` takes (R2). A fresh start loads the step's scenario. Within a story, the
 * scenario loads only when it differs from the one loaded, unless the step that declares it
 * accepts the visitor's own state (`keep`).
 */
export function openStep(
  progress: StoryProgress | null,
  story: Story,
  step: number,
  state: DemoState,
): { progress: StoryProgress; load: ScenarioId | null } {
  const n = clampStep(story, step)
  const needed = scenarioAt(story, n)
  const next: StoryProgress = { storyId: story.id, step: n, loaded: needed }
  if (!progress || progress.storyId !== story.id) return { progress: next, load: needed }
  if (progress.loaded === needed) return { progress: next, load: null }
  const own = story.steps[n - 1]!
  const kept = own.scenarioPatch === needed && own.keep?.(state) === true
  return { progress: next, load: kept ? null : needed }
}

export type UrlAction =
  | { kind: 'none' }
  | { kind: 'strip' }
  | { kind: 'append'; storyId: StoryId; step: number }
  | { kind: 'rewrite'; storyId: StoryId; step: number }
  | { kind: 'open'; storyId: StoryId; step: number; rewrite: boolean }

/**
 * What the URL's `story` and `step` ask for, against saved progress (R3). No story param: put the
 * active story back. Unknown story: strip it. A bad step: clamp it and rewrite the param.
 */
export function urlAction(
  params: URLSearchParams,
  progress: StoryProgress | null,
  stories: readonly Story[],
): UrlAction {
  const id = params.get('story')
  if (id === null)
    return progress
      ? { kind: 'append', storyId: progress.storyId, step: progress.step }
      : { kind: 'none' }
  const story = stories.find((s) => s.id === id)
  if (!story) return { kind: 'strip' }
  const raw = params.get('step')
  const step = clampStep(story, raw === null ? Number.NaN : Number(raw))
  const rewrite = raw !== String(step)
  if (progress?.storyId === story.id && progress.step === step)
    return rewrite ? { kind: 'rewrite', storyId: story.id, step } : { kind: 'none' }
  return { kind: 'open', storyId: story.id, step, rewrite }
}

/** Saved progress if it still fits today's stories and scenarios; anything else is dropped (R4). */
export function validProgress(value: unknown, stories: readonly Story[]): StoryProgress | null {
  if (!value || typeof value !== 'object') return null
  const { storyId, step, loaded } = value as Record<string, unknown>
  const story = stories.find((s) => s.id === storyId)
  if (
    !story ||
    !Number.isInteger(step) ||
    (step as number) < 1 ||
    (step as number) > story.steps.length
  )
    return null
  if (!SCENARIO_IDS.includes(loaded as ScenarioId)) return null
  return { storyId: story.id, step: step as number, loaded: loaded as ScenarioId }
}
