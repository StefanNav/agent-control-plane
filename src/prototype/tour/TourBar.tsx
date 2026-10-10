import { Button, Icon, Menu, VisuallyHidden } from '../../design-system'
import { beatAt } from './engine'
import type { TourControls, TourRate, TourStatus } from './player'
import type { Chapter, Position, Timeline } from './types'
import { TOUR_BAR_HEIGHT } from './useTour'
import styles from './TourBar.module.css'

/** The speeds the bar cycles through (R3). */
const RATES: readonly TourRate[] = [1, 1.25, 1.5]

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
}

/**
 * The player bar (spec §4.2, R4): the sentence being spoken, then Play/Pause (the one indigo
 * control), the chapter menu, one progress segment per chapter, the time, speed, captions and Exit.
 * After a take-over it says the visitor is driving and offers Resume tour instead of Play.
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
}: TourBarProps) {
  const chapter = chapters[pos.chapter]!
  const n = pos.chapter + 1
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]!
  return (
    <aside
      aria-label="Tour"
      data-tour="bar"
      data-modal-companion
      data-skipped={skipped}
      className={styles.bar}
      style={{ height: TOUR_BAR_HEIGHT }}
    >
      <VisuallyHidden role="status">{`Chapter ${n}: ${chapter.title}`}</VisuallyHidden>
      {captions ? <p className={styles.caption}>{beatAt(chapters, pos).text}</p> : null}
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
        ) : status === 'playing' ? (
          <Button variant="primary" className={styles.play} onClick={() => controls.pause()}>
            Pause tour
          </Button>
        ) : (
          <Button
            variant="primary"
            className={styles.play}
            onClick={() => {
              unlock()
              controls.play()
            }}
          >
            Play tour
          </Button>
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
                sub: c.decision ? `Decision ${c.decision}` : undefined,
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
