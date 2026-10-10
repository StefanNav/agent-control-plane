import type { ScenarioId } from '../../data/scenarios'
import type { PersonaId } from '../../data/types'

/** The tour's chapters, in running order (R1). Also the `?tour=` value. */
export type ChapterId =
  | 'open'
  | 'problem'
  | 'people'
  | 'onboarding'
  | 'earning-trust'
  | 'supervising'
  | 'step-down'
  | 'decisions'
  | 'process'
  | 'validate'
  | 'close'

/** A key of `CARDS` in `cards.ts`. */
export type CardId = string

/** Something the tour does on screen while a beat plays. */
export type TourAction =
  | { kind: 'outline'; target: string }
  | { kind: 'scroll'; target: string }
  | { kind: 'click'; target: string }
  | { kind: 'type'; target: string; text: string }
  | { kind: 'card'; card: CardId; side?: 'left' | 'right' }
  | { kind: 'clearCard' }
  | { kind: 'wait'; ms: number }

/** One spoken sentence: its clip, its caption and what happens on screen as it plays. */
export interface Beat {
  /** Stable id; names its clip (`public/tour/audio/<id>.m4a`). */
  id: string
  /** The sentence as spoken; also the caption. */
  text: string
  /** Run in order when the beat starts. */
  actions?: TourAction[]
  /** Interludes: the item this beat reveals. */
  reveal?: string
}

/** One screen of the tour: a route, the state it needs and the beats narrated there. */
export interface TourStep {
  id: string
  route: string
  /** Loaded on entry; interludes have none. */
  scenario?: ScenarioId
  persona?: PersonaId
  beats: Beat[]
}

export interface Chapter {
  id: ChapterId
  title: string
  decision?: 1 | 2 | 3
  steps: TourStep[]
}

/** Where the tour is: 0-based indexes into the chapters, the chapter's steps and the step's beats (R2). */
export interface Position {
  chapter: number
  step: number
  beat: number
}

/** The measured (or placeholder) length of one beat's clip. */
export interface ManifestEntry {
  ms: number
  source: 'placeholder' | 'recorded'
  /** `textHash` of the beat text the clip was made from; a mismatch means the clip is stale. */
  textHash: string
}

/** Clip lengths by beat id. */
export type Manifest = Record<string, ManifestEntry>

/** Every beat laid end to end, in milliseconds. */
export interface Timeline {
  total: number
  /** Indexed by chapter. */
  chapterStartMs: number[]
  /** By beat id. */
  beatStartMs: Record<string, number>
  /** By beat id. */
  beatMs: Record<string, number>
}
