import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  MAX_STEP_S,
  WELCOME_TOTAL_S,
  pebblePath,
  restPose,
  transformOf,
  welcomeFrame,
  type Pose,
} from './geometry'
import { hasWelcomed, markWelcomed } from './session'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export type WelcomeState = 'dancing' | 'still'

const REST = [0, 1, 2, 3].map(restPose)

/**
 * Runs the welcome on four rendered paths. It decides once, at mount, whether to dance: not under
 * reduced motion, not while `hold` (the tour is open), not after any earlier view in the session.
 * Each frame writes the paths' `d` and `transform` straight to the DOM, so React renders nothing per
 * frame; the paths' props stay at rest, which is also the first and the last frame. Time is the frames' own timestamps,
 * a step at most `MAX_STEP_S`, so a hidden tab (no frames) never skips the dance. Once still, it
 * stays still: holding or reducing motion mid-dance jumps to rest, and letting go doesn't restart it.
 */
export interface WelcomeMotionOptions {
  /** Dance only on the session's first view (default). Off when the caller has decided already. */
  once?: boolean
  /** Called when a dance comes to rest: it ended, or it was held or reduced mid-way. */
  onSettled?: () => void
}

export function useWelcomeMotion(
  paths: RefObject<(SVGPathElement | null)[]>,
  hold: boolean,
  { once = true, onSettled }: WelcomeMotionOptions = {},
): WelcomeState {
  const reduced = usePrefersReducedMotion()
  // Pure: React calls an initializer twice under StrictMode. The session is marked once mounted, below.
  const [state, setState] = useState<WelcomeState>(() =>
    !hold && !reduced && (!once || !hasWelcomed()) ? 'dancing' : 'still',
  )
  // Adjusting state while rendering, for a prop that changed: it stops before anything paints.
  if (state === 'dancing' && (hold || reduced)) setState('still')

  // Any view of the page uses up the welcome, held or still: seen again later in the session (the
  // tour closing on this page, a return visit), it stays still.
  useLayoutEffect(() => markWelcomed(), [])

  useLayoutEffect(() => {
    if (state !== 'dancing') return
    // The elements as they are now: React detaches the paths' refs before this effect's cleanup runs,
    // and the cleanup must still put them back at rest.
    const nodes = [...paths.current]
    const draw = (poses: readonly Pose[]) =>
      poses.forEach((pose, i) => {
        const path = nodes[i]
        if (!path) return
        path.setAttribute('d', pebblePath(i, pose[4], pose[5]))
        path.setAttribute('transform', transformOf(pose))
      })
    let frame = 0
    let previous: number | null = null
    let elapsed = 0
    const tick = (now: number) => {
      elapsed += previous === null ? 0 : Math.min((now - previous) / 1000, MAX_STEP_S)
      previous = now
      if (elapsed >= WELCOME_TOTAL_S) {
        frame = 0
        setState('still')
        return
      }
      draw(welcomeFrame(elapsed))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      draw(REST)
    }
  }, [state, paths])

  // A dance that comes to rest says so, once; one that never started says nothing.
  const settled = useRef(onSettled)
  const danced = useRef(false)
  useLayoutEffect(() => {
    settled.current = onSettled
  })
  useEffect(() => {
    if (state === 'dancing') danced.current = true
    else if (danced.current) {
      danced.current = false
      settled.current?.()
    }
  }, [state])

  return state
}
