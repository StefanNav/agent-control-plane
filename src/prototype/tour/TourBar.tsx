import { useEffect, useRef, useState } from 'react'
import { Button, Icon, Menu, VisuallyHidden } from '../../design-system'
import { beatAt } from './engine'
import type { TourControls, TourRate, TourStatus } from './player'
import type { Chapter, Position, Timeline } from './types'
import { typographic } from './typographic'
import { TOUR_BAR_HEIGHT } from './useTour'
import { VoiceLevel, type VoiceLevelProps } from './VoiceLevel'
import styles from './TourBar.module.css'

/** The speeds the bar cycles through (R3). */
const RATES: readonly TourRate[] = [1, 1.25, 1.5]

/**
 * What the status region says. It mounts empty and fills a frame later: a region inserted already
 * holding its text isn't announced, so the first chapter would go unheard. After that it follows
 * the chapter at once.
 */
function useAnnounced(text: string): string {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return ready ? text : ''
}

/** Milliseconds as m:ss. */
function clock(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export interface TourBarProps {
  chapters: Chapter[]
  timeline: Timeline
  status: Exclude<TourStatus, 'idle'>
  pos: Position
  rate: TourRate
  captions: boolean
  /** Milliseconds from the start of the tour to now. */
  elapsed: number
  /** How many actions the tour has skipped since it opened (`data-skipped`, for the e2e tests). */
  skipped: number
  controls: Pick<
    TourControls,
    'play' | 'pause' | 'resume' | 'jump' | 'setRate' | 'toggleCaptions' | 'exit'
  >
  /** Called inside the Play and Resume clicks, before playing, so the browser lets the clips play. */
  unlock(): void
  /** The voice meter's line and voice: the current line's levels and clip, and the voice's playhead. */
  meter: Omit<VoiceLevelProps, 'playing'>
  /**
   * The id of the welcome's body while the welcome is up: Play tour, which it points at, is ringed,
   * takes focus (so Enter or Space starts the tour) and is described by it.
   */
  welcome?: string
}

/**
 * The player bar (spec §4.2, R4): the sentence being spoken, led by the voice meter while the tour
 * plays, then Play/Pause (the one indigo control; the meter sits beside it when captions are off),
 * the chapter menu, one progress segment per chapter, the time, speed, captions and Exit. After a
 * take-over it says the visitor is driving and offers Resume tour instead of Play, with no meter.
 */
export function TourBar({
  chapters,
  timeline,
  status,
  pos,
  rate,
  captions,
  elapsed,
  skipped,
  controls,
  unlock,
  meter,
  welcome,
}: TourBarProps) {
  const playRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (welcome) playRef.current?.focus()
  }, [welcome])
  const chapter = chapters[pos.chapter]!
  const n = pos.chapter + 1
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]!
  const announced = useAnnounced(`Chapter ${n}: ${chapter.title}`)
  const voice = <VoiceLevel playing={status === 'playing'} {...meter} />
  return (
    <aside
      aria-label="Tour"
      data-tour="bar"
      data-modal-companion
      data-skipped={skipped}
      className={styles.bar}
      style={{ height: TOUR_BAR_HEIGHT }}
    >
      <VisuallyHidden role="status">{announced}</VisuallyHidden>
      {captions ? (
        // The meter leads the line it voices. It keeps its space while hidden, so the sentence never
        // moves when the tour pauses or the visitor drives.
        <div className={styles.line}>
          {voice}
          <p className={styles.caption}>{typographic(beatAt(chapters, pos).text)}</p>
        </div>
      ) : null}
      <div className={styles.controls}>
        {status === 'driving' ? (
          <>
            <Button
              variant="primary"
              onClick={() => {
                unlock()
                controls.resume()
              }}
            >
              Resume tour
            </Button>
            <span className={styles.driving}>Paused. You’re driving.</span>
          </>
        ) : (
          // Play/Pause, with the voice meter beside it when captions are off (it leads the caption
          // otherwise). The meter keeps its space while hidden, so Play and Pause swap in place.
          <div className={styles.player}>
            {status === 'playing' ? (
              <Button variant="primary" className={styles.play} onClick={() => controls.pause()}>
                Pause tour
              </Button>
            ) : (
              <Button
                ref={playRef}
                variant="primary"
                className={styles.play}
                data-tour="play"
                data-welcome={welcome ? '' : undefined}
                aria-describedby={welcome}
                onClick={() => {
                  unlock()
                  controls.play()
                }}
              >
                Play tour
              </Button>
            )}
            {captions ? null : voice}
          </div>
        )}
        <Menu
          placement="above"
          width={320}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              className={styles.chapter}
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={toggle}
            >
              <span className={styles.chapterTitle}>
                <span className={styles.number}>{n}</span> · {chapter.title}
              </span>
              <Icon name="chevron" size={10} />
            </button>
          )}
          groups={[
            {
              items: chapters.map((c, i) => ({
                id: c.id,
                label: (
                  <>
                    <span>{c.title}</span>
                    <span className={styles.start}>{clock(timeline.chapterStartMs[i] ?? 0)}</span>
                  </>
                ),
                onSelect: () => controls.jump(i),
              })),
            },
          ]}
        />
        <div role="group" aria-label="Chapters" className={styles.progress}>
          {chapters.map((c, i) => {
            const start = timeline.chapterStartMs[i] ?? 0
            const length = (timeline.chapterStartMs[i + 1] ?? timeline.total) - start
            const share = length > 0 ? Math.min(1, Math.max(0, (elapsed - start) / length)) : 0
            return (
              <button
                key={c.id}
                type="button"
                className={styles.segment}
                style={{ flexGrow: Math.max(1, length) }}
                aria-label={`Go to chapter ${i + 1}: ${c.title}`}
                onClick={() => controls.jump(i)}
              >
                <span className={styles.fill} style={{ width: `${share * 100}%` }} />
              </button>
            )
          })}
        </div>
        <span className={styles.time}>{`${clock(elapsed)} / ${clock(timeline.total)}`}</span>
        <button
          type="button"
          className={styles.toggle}
          aria-label={`Speed ${rate}×`}
          onClick={() => controls.setRate(nextRate)}
        >
          {rate}×
        </button>
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={captions}
          onClick={() => controls.toggleCaptions()}
        >
          Captions
        </button>
        <Button variant="ghost" onClick={() => controls.exit()}>
          Exit tour
        </Button>
      </div>
    </aside>
  )
}
