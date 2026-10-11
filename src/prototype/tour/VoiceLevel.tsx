import { useLayoutEffect, useRef, useState } from 'react'
import { inClip, levelAt } from './levels'
import styles from './VoiceLevel.module.css'

/** A bar at its full height, and at its least (a quiet moment). */
const MAX_PX = 14
const MIN_PX = 2

/**
 * How far back from the playhead each bar reads the clip's level, so the four differ: out of order,
 * so they move as a meter does rather than a level scrolling across.
 */
const LAG_MS = [100, 0, 150, 50] as const

/** Under reduced motion, while a line plays: still, at a mid level. */
const STILL_PX = [6, 10, 8, 12] as const

/** A bar `px` tall, as a scale of the full bar (the height moves by transform, not layout). */
const scale = (px: number) => `scaleY(${px / MAX_PX})`

/** A level (0–9) as a bar's height: its share of the full bar, never under the rest height. */
const levelPx = (level: number) => Math.max(MIN_PX, (level / 9) * MAX_PX)

export interface VoiceLevelProps {
  /** The tour is playing (not paused, driving or closed). */
  playing: boolean
  /** The current line's levels: one digit (0–9) per 50 ms of its clip (`ManifestEntry.levels`). */
  levels: string
  /** The current line's clip length, in milliseconds. */
  clipMs: number
  /** How far into its clip the voice is (`Voice.currentMs`). */
  currentMs(): number
  reducedMotion: boolean
}

/**
 * The voice meter in the tour bar: four indigo bars that move with the narrator's voice, so a visitor
 * whose sound is low or off can see the tour is speaking. It shows only while the tour plays
 * (`data-playing`), and is hidden otherwise, keeping its space. While a line's clip runs
 * (`data-speaking`) each frame reads the voice's playhead against the clip's precomputed levels;
 * every quiet moment (a pause between words, between lines, a line's after-actions, a screen
 * settling) sits at the 2 px minimum. There is no loop unless the tour is playing. Under reduced
 * motion there is none at all: the bars hold a still profile while a clip runs, checked each time
 * the bar renders (every tick while the tour plays). Hidden from assistive tech: the captions carry
 * the words.
 */
export function VoiceLevel({ playing, levels, clipMs, currentMs, reducedMotion }: VoiceLevelProps) {
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  /** Was a clip running at the last frame? Only read while animated, and set before its first paint. */
  const [running, setRunning] = useState(false)
  const animated = playing && !reducedMotion

  // A layout effect: its first frame is drawn before the browser paints, so a meter shown again
  // never shows what it showed before; and no frame draws over the bars a pause has just rendered.
  useLayoutEffect(() => {
    if (!animated) return
    let frame = 0
    let last: boolean | null = null
    /** What each bar was last set to: a window lasts about three frames, so most frames set nothing. */
    const shown: string[] = []
    const draw = () => {
      const ms = currentMs()
      const now = inClip(ms, clipMs)
      if (now !== last) {
        last = now
        setRunning(now)
      }
      LAG_MS.forEach((lag, i) => {
        const bar = bars.current[i]
        const transform = scale(now ? levelPx(levelAt(levels, ms - lag)) : MIN_PX)
        if (!bar || shown[i] === transform) return
        bar.style.transform = transform
        shown[i] = transform
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [animated, levels, clipMs, currentMs])

  const speaking = animated ? running : playing && inClip(currentMs(), clipMs)
  return (
    <span
      aria-hidden="true"
      data-tour="voice-level"
      data-playing={playing}
      data-speaking={speaking}
      className={styles.meter}
    >
      {LAG_MS.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el
          }}
          className={styles.bar}
          // While animated, the frames set the height; otherwise it is still, or quiet.
          style={animated ? undefined : { transform: scale(speaking ? STILL_PX[i]! : MIN_PX) }}
        />
      ))}
    </span>
  )
}
