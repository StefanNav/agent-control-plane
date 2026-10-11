import { isInterlude } from '../tour/engine'
import { CHAPTERS } from '../tour/script'
import type { CardId, Chapter, ChapterId } from '../tour/types'
import { stepHref, storyById, type StoryId } from '../stories'

/** The chapters the case study tells: the whole tour but its close, which only hands the visitor on. */
export const CASE_CHAPTERS: Chapter[] = CHAPTERS.filter((chapter) => chapter.id !== 'close')

/** One paragraph of a chapter's narration. */
export interface Paragraph {
  text: string
  /** What the line that opens it brings onto the tour's page, if anything (`Beat.reveal`). */
  reveal?: string
}

/**
 * A chapter's narration, word for word. A step starts a paragraph, and so does any line that
 * reveals something on an interlude's page: that is where the tour moves on to a new idea.
 */
export function paragraphs(chapter: Chapter): Paragraph[] {
  const out: Paragraph[] = []
  for (const step of chapter.steps) {
    let open = false
    for (const beat of step.beats) {
      if (open && beat.reveal === undefined) {
        out[out.length - 1]!.text += ` ${beat.text}`
        continue
      }
      out.push(
        beat.reveal === undefined ? { text: beat.text } : { text: beat.text, reveal: beat.reveal },
      )
      open = true
    }
  }
  return out
}

/** The cards the narration puts up (a beat's `card` actions), once each, in the order they appear. */
export function cardIds(chapter: Chapter): CardId[] {
  const ids = chapter.steps.flatMap((step) =>
    step.beats.flatMap((beat) =>
      [...(beat.actions ?? []), ...(beat.after ?? [])].flatMap((action) =>
        action.kind === 'card' ? [action.card] : [],
      ),
    ),
  )
  return [...new Set(ids)]
}

/** "Play from here": the tour, opened on this chapter. */
export function playLink(chapter: Chapter): string {
  return `/?tour=${chapter.id}`
}

/** The story step that shows a product chapter's screen: a story and its 1-based step. */
const LIVE_STEPS: Partial<Record<ChapterId, [story: StoryId, step: number]>> = {
  open: ['marcus', 3],
  onboarding: ['dana', 1],
  'earning-trust': ['priya', 2],
  supervising: ['marcus', 6],
  'step-down': ['priya', 7],
}

export interface ChapterLink {
  label: string
  to: string
}

/**
 * Where a chapter can be seen outside the tour: a product chapter's live screen, an interlude's own
 * page. "Who it’s for" has none; its steps play on the landing page.
 */
export function liveLink(chapter: Chapter): ChapterLink | null {
  const live = LIVE_STEPS[chapter.id]
  if (live) {
    const story = storyById(live[0])
    if (!story) throw new Error(`No story ${live[0]} for the ${chapter.id} chapter`)
    return { label: 'Open the live screen', to: stepHref(story, live[1]) }
  }
  const route = chapter.steps[0]?.route
  if (route !== undefined && isInterlude(route)) return { label: 'Open the page', to: route }
  return null
}
