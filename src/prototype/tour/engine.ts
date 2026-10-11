import type { ScenarioId } from '../../data/scenarios'
import type { PersonaId } from '../../data/types'
import type { Beat, Chapter, Manifest, Position, Timeline, TourStep } from './types'

/** The beat at a position. */
export function beatAt(chapters: Chapter[], pos: Position): Beat {
  return stepAt(chapters, pos).beats[pos.beat]!
}

/** The step at a position. */
export function stepAt(chapters: Chapter[], pos: Position): TourStep {
  return chapters[pos.chapter]!.steps[pos.step]!
}

/** The first beat of a chapter. */
export function chapterStart(chapterIndex: number): Position {
  return { chapter: chapterIndex, step: 0, beat: 0 }
}

/** Beat 0 of the next step, running on into the next chapter; null after the last step. */
export function nextStep(chapters: Chapter[], pos: Position): Position | null {
  if (pos.step + 1 < chapters[pos.chapter]!.steps.length)
    return { chapter: pos.chapter, step: pos.step + 1, beat: 0 }
  if (pos.chapter + 1 < chapters.length) return chapterStart(pos.chapter + 1)
  return null
}

/** Beat 0 of the step before, back into the previous chapter's last step; null on the very first step. */
export function prevStep(chapters: Chapter[], pos: Position): Position | null {
  if (pos.step > 0) return { chapter: pos.chapter, step: pos.step - 1, beat: 0 }
  if (pos.chapter === 0) return null
  const chapter = pos.chapter - 1
  return { chapter, step: chapters[chapter]!.steps.length - 1, beat: 0 }
}

/** The next beat, crossing steps and chapters; null after the last beat of the tour. */
export function nextBeat(chapters: Chapter[], pos: Position): Position | null {
  if (pos.beat + 1 < stepAt(chapters, pos).beats.length) return { ...pos, beat: pos.beat + 1 }
  return nextStep(chapters, pos)
}

/** Is the route one of the tour's own pages (`/tour/…`) rather than a product screen? */
export function isInterlude(route: string): boolean {
  return route.startsWith('/tour/')
}

/** What entering a step takes: the scenario to load and the persona to be (null for interludes), then the route. */
export function enterStep(step: TourStep): {
  load: ScenarioId | null
  persona: PersonaId | null
  route: string
} {
  return { load: step.scenario ?? null, persona: step.persona ?? null, route: step.route }
}

/** A beat's length when it has no clip yet: 400 ms a word, at least 1500 (R3). */
export function estimateMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1500, words * 400)
}

/** Every beat laid end to end, using the clip length where the manifest has one and the estimate where not. */
export function buildTimeline(chapters: Chapter[], manifest: Manifest): Timeline {
  const timeline: Timeline = { total: 0, chapterStartMs: [], beatStartMs: {}, beatMs: {} }
  for (const chapter of chapters) {
    timeline.chapterStartMs.push(timeline.total)
    for (const step of chapter.steps)
      for (const beat of step.beats) {
        const ms = manifest[beat.id]?.ms ?? estimateMs(beat.text)
        timeline.beatStartMs[beat.id] = timeline.total
        timeline.beatMs[beat.id] = ms
        timeline.total += ms
      }
  }
  return timeline
}

/** Milliseconds from the start of the tour to a point `intoBeatMs` into the beat at `pos`, kept inside that beat. */
export function elapsedMs(
  timeline: Timeline,
  chapters: Chapter[],
  pos: Position,
  intoBeatMs: number,
): number {
  const { id } = beatAt(chapters, pos)
  return timeline.beatStartMs[id]! + Math.min(Math.max(intoBeatMs, 0), timeline.beatMs[id]!)
}

export type TourUrlAction = { kind: 'none' } | { kind: 'strip' } | { kind: 'open'; chapter: number }

/** What the URL's `tour` asks for (R2): no param, nothing; a chapter id, open at it; anything else, strip it. */
export function tourUrlAction(params: URLSearchParams, chapters: Chapter[]): TourUrlAction {
  const id = params.get('tour')
  if (id === null) return { kind: 'none' }
  const chapter = chapters.findIndex((c) => c.id === id)
  return chapter < 0 ? { kind: 'strip' } : { kind: 'open', chapter }
}
