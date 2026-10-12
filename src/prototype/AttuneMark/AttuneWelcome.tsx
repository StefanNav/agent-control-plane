import { useRef } from 'react'
import { isDeep, pebblePath, restPose, transformOf } from './geometry'
import { useWelcomeMotion } from './useWelcomeMotion'
import styles from './AttuneMark.module.css'

export interface AttuneWelcomeProps {
  /** The whole square footprint in px, the dance's travel included (the resting mark is about 63% of it). */
  size?: number
  /** Keep still (the tour is open, and its own welcome is the one focal point). */
  hold?: boolean
  /** Dance only on the session's first view (default); off when the caller has decided already. */
  once?: boolean
  /** Called when the dance comes to rest. */
  onSettled?: () => void
}

/**
 * The motion kit's "First hello" on the landing page: once a browser session the pebbles dance for
 * 2.25 s, then settle into the still mark and stop. Still from the start under reduced motion, while
 * `hold`, or later in the session. Decorative, and nothing waits for it.
 */
export function AttuneWelcome({ size = 140, hold = false, once, onSettled }: AttuneWelcomeProps) {
  const paths = useRef<(SVGPathElement | null)[]>([])
  const state = useWelcomeMotion(paths, hold, { once, onSettled })
  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-attune="welcome"
      data-state={state}
      className={styles.mark}
    >
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          ref={(path) => {
            paths.current[i] = path
          }}
          className={isDeep(i) ? styles.deep : styles.soft}
          d={pebblePath(i, 0, 1)}
          transform={transformOf(restPose(i))}
        />
      ))}
    </svg>
  )
}
