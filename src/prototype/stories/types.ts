import type { ScenarioId } from '../../data/scenarios'
import type { DemoState, PersonaId } from '../../data/types'

/** One story per persona, so a story's id is its persona's (R1). */
export type StoryId = PersonaId

/** One moment in a story (spec §4.3). */
export interface Step {
  /** Where the step happens; may carry its own query, e.g. `?tab=scorecard`. */
  route: string
  title: string
  /** 2–3 sentences of narration. */
  body: string
  /** A `data-story-target` value on that screen; it gets a 2 px ink outline. */
  target?: string
  /** The scenario this step needs (a time skip). It holds for the steps after it. */
  scenarioPatch?: ScenarioId
  /** True when the visitor's own state already shows what `scenarioPatch` sets up; it isn't loaded then. */
  keep?: (s: DemoState) => boolean
}

export interface Story {
  id: StoryId
  personaId: PersonaId
  title: string
  /** One line on what this person does in the product (landing card, desktop gate). */
  summary: string
  /** Loaded when the story starts. */
  scenarioId: ScenarioId
  steps: Step[]
}

/** Where the visitor is in a story, and which scenario the story last loaded. */
export interface StoryProgress {
  storyId: StoryId
  /** 1-based. */
  step: number
  loaded: ScenarioId
}
