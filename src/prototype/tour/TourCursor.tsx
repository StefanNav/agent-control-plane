import { useEffect, useState } from 'react'
import styles from './TourCursor.module.css'

/** How long the cursor takes to glide to a target at 1× (R3; the player waits the same). */
const GLIDE_MS = 600

/** How long the cursor stays after its last move or click before it fades (Ruling 18). */
const IDLE_MS = 1500

export interface TourCursorProps {
  x: number
  y: number
  visible: boolean
  /** The player's click count: each rise is one press, and one pulse of the ring. */
  clicks: number
  rate: number
}

/**
 * The tour's cursor (spec §4.3): a 20 px ink arrow gliding to each target, and a 26 px ink ring that
 * pulses once per click, after the glide. It never takes the pointer and is hidden from assistive
 * tech (the captions say what it does). Hidden, not removed, while paused, so showing it again
 * doesn't replay the last pulse. It fades 1500 ms after its last move or click, so it never rests
 * on a control of a screen it has left, and shows again on its next move (Ruling 18).
 */
export function TourCursor({ x, y, visible, clicks, rate }: TourCursorProps) {
  // Clicks made before this overlay mounted aren't pulsed when it appears.
  const [mountedAt] = useState(clicks)
  // Each move or click is a new spot; the cursor is idle once a spot has stood for IDLE_MS.
  const spot = `${x},${y},${clicks}`
  const [restedAt, setRestedAt] = useState<string | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setRestedAt(spot), IDLE_MS)
    return () => clearTimeout(timer)
  }, [spot])
  const glideMs = `${Math.round(GLIDE_MS / rate)}ms`
  return (
    <div
      aria-hidden="true"
      data-tour="cursor"
      data-visible={visible}
      data-idle={restedAt === spot}
      className={styles.cursor}
      style={{ transform: `translate(${x}px, ${y}px)`, transitionDuration: glideMs }}
    >
      {clicks > mountedAt ? (
        <span
          key={clicks}
          data-tour="ring"
          className={styles.ring}
          style={{ animationDelay: glideMs }}
        />
      ) : null}
      <svg className={styles.arrow} width="20" height="20" viewBox="0 0 20 20">
        <path d="M1.5 1.5v14.6l4.1-3.9 2.7 6.1 2.7-1.2-2.7-6h5.7Z" />
      </svg>
    </div>
  )
}
