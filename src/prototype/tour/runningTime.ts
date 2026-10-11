import { buildTimeline } from './engine'
import type { Beat, Chapter, Manifest, TourAction } from './types'

/** What a press of the cursor adds to the running time: its glide and the page answering (Ruling 27). */
export const PRESS_MS = 650

/** Typing, per character at 1× (R3): the action runner's pace, and so the model's. */
export const TYPE_MS = 25

/** How long a list of actions takes to run: presses, waits and typing; the rest take no time. */
export function actionsMs(list: TourAction[] = []): number {
  let ms = 0
  for (const action of list) {
    if (action.kind === 'click' || action.kind === 'choose') ms += PRESS_MS
    else if (action.kind === 'wait') ms += action.ms
    else if (action.kind === 'type') ms += action.text.length * TYPE_MS
  }
  return ms
}

/**
 * A beat's running time: its clip and its actions start together, and the beat runs on until both are
 * done; then its after-actions run.
 */
export function beatRunningMs(beat: Beat, clipMs: number): number {
  return Math.max(clipMs, actionsMs(beat.actions)) + actionsMs(beat.after)
}

/**
 * The whole tour's running time in milliseconds: every beat's, end to end, by its clip's length (the
 * estimate where it has none yet) and what its actions add. This is the model the real-time run is
 * held to; the bar's own total counts the clips alone.
 */
export function runningMs(chapters: Chapter[], manifest: Manifest): number {
  const { beatMs } = buildTimeline(chapters, manifest)
  return chapters
    .flatMap((chapter) => chapter.steps.flatMap((step) => step.beats))
    .reduce((sum, beat) => sum + beatRunningMs(beat, beatMs[beat.id]!), 0)
}
