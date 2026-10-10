import { useMemo } from 'react'
import { stepAt } from '../engine'
import { tourRuntime, useTour } from '../useTour'

/** What the tour has brought in on an interlude, or `'all'` when the page reads as a static page. */
export type Reveal = Set<string> | 'all'

/**
 * The items of an interlude that show (spec §4.3): while the tour is on the step `stepId`, the
 * `reveal` ids of the beats it has reached there, in order, so the last is the current item; `'all'`
 * outside the tour, or while the tour is on another step, so a visit or a link reads as a static page.
 */
export function useReveal(stepId: string): Reveal {
  const { chapters } = tourRuntime()
  /** The beat the tour has reached on this step; -1 when it isn't on it. */
  const reached = useTour((s) =>
    s.status !== 'idle' && stepAt(chapters, s.pos).id === stepId ? s.pos.beat : -1,
  )
  return useMemo(() => {
    if (reached < 0) return 'all'
    const step = chapters.flatMap((c) => c.steps).find((s) => s.id === stepId)
    const ids = (step?.beats ?? []).slice(0, reached + 1).flatMap((b) => b.reveal ?? [])
    return new Set(ids)
  }, [chapters, stepId, reached])
}

/** How an item shows: on a static page, the current item, one reached before it, or not yet. */
export type ItemState = 'shown' | 'current' | 'reached' | 'hidden'

/**
 * The state of the item brought in by the reveal id `id` (an item in a group takes its group's id).
 * The current item is the last one revealed.
 */
export function itemState(reveal: Reveal, id: string): ItemState {
  if (reveal === 'all') return 'shown'
  if (!reveal.has(id)) return 'hidden'
  return [...reveal].at(-1) === id ? 'current' : 'reached'
}
