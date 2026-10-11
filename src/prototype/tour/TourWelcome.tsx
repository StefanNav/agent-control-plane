import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Button } from '../../design-system'
import { NARRATOR_PHOTO } from './narrator'
import type { Chapter } from './types'
import styles from './TourWelcome.module.css'

/** How long it fades out for, as its CSS. */
const FADE_MS = 200

/** The card's width, as its CSS. */
const CARD_WIDTH = 360

/** The card keeps this far from the window's sides. */
const GUTTER = 16

/** The pointer keeps this far from the card's sides, clear of its rounded corners. */
const NOTCH_INSET = 24

/** The card's border, as its CSS: the pointer is placed from inside it. */
const BORDER = 1

export interface TourWelcomeProps {
  /** Up; false fades it out, then it is gone. */
  open: boolean
  /** The id for its body, which Play tour is described by while it is up. */
  bodyId: string
  chapters: Chapter[]
  /** The chapter the link opened. */
  chapter: number
  /** The tour's length in whole minutes, as the landing page's Play says it. */
  minutes: number
  /** Look around first, Escape, or a click on the dimmed page. */
  onDismiss(): void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Where the card goes: lined up with Play tour, inside the window, its pointer under the button's
 * middle.
 */
function placeWelcome(play: DOMRect, windowWidth: number): { left: number; notch: number } {
  const left = clamp(play.left, GUTTER, windowWidth - CARD_WIDTH - GUTTER)
  const middle = play.left + play.width / 2 - left - BORDER
  const notch = clamp(middle, NOTCH_INSET, CARD_WIDTH - NOTCH_INSET)
  return { left, notch }
}

/** On screen while open, and for its fade after; false once it has gone. */
function usePresent(open: boolean): boolean {
  const [present, setPresent] = useState(open)
  if (open && !present) setPresent(true)
  useEffect(() => {
    if (open) return
    const timer = setTimeout(() => setPresent(false), FADE_MS)
    return () => clearTimeout(timer)
  }, [open])
  return open || present
}

/**
 * The welcome (Checkpoint E): when a link opens the tour on the page's first location, the product
 * dims and a card above the bar points at Play tour. A labelled region, not a dialog, so the tour's
 * keys still work while it is up (Ruling 45); it has no Play of its own, so the tour starts from the
 * bar's, inside the visitor's gesture. Look around first, Escape or a click on the dimmed page
 * dismisses it, the tour still paused. Fading out, it is inert and hidden from assistive tech.
 */
export function TourWelcome({
  open,
  bodyId,
  chapters,
  chapter,
  minutes,
  onDismiss,
}: TourWelcomeProps) {
  const present = usePresent(open)
  const titleId = useId()
  const cardRef = useRef<HTMLElement>(null)
  const notchRef = useRef<HTMLSpanElement>(null)

  const close = () => {
    // Focus in the card would be lost as it goes: hand it to Play tour, which the card points at.
    if (cardRef.current?.contains(document.activeElement))
      document.querySelector<HTMLElement>('[data-tour="play"]')?.focus()
    onDismiss()
  }
  const closeOnKey = useEffectEvent(close)

  // Aim at Play tour where it is, before the first paint and whenever the window resizes.
  useLayoutEffect(() => {
    if (!open) return
    const card = cardRef.current
    const notch = notchRef.current
    const play = document.querySelector<HTMLElement>('[data-tour="play"]')
    if (!card || !notch || !play) return
    const measure = () => {
      const place = placeWelcome(play.getBoundingClientRect(), window.innerWidth)
      card.style.left = `${place.left}px`
      notch.style.left = `${place.notch}px`
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(play)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeOnKey()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!present) return null

  // A press on the dimmed page moves no focus (Play tour keeps it) and selects nothing.
  const hold = (event: PointerEvent | MouseEvent) => event.preventDefault()
  const n = chapter + 1
  return (
    <div
      data-tour="welcome"
      data-state={open ? 'open' : 'closing'}
      aria-hidden={open ? undefined : true}
      inert={!open}
      className={styles.layer}
    >
      <div
        data-scrim
        className={styles.scrim}
        onPointerDown={hold}
        onMouseDown={hold}
        onClick={(event) => {
          // The click is the welcome's: nothing on the page under it hears of it.
          event.stopPropagation()
          close()
        }}
      />
      <section ref={cardRef} aria-labelledby={titleId} className={styles.card}>
        <div className={styles.head}>
          <img className={styles.photo} src={NARRATOR_PHOTO} alt="" width={40} height={40} />
          <h2 id={titleId} className={styles.title}>
            Welcome to Agent Control Plane
          </h2>
        </div>
        <div id={bodyId} className={styles.body}>
          <p className={styles.text}>
            A working prototype of how a hospital brings on and supervises its AI agents. Press Play
            and I’ll walk you through it in my own voice, about {minutes} minutes, while it clicks
            through the real screens. Pause or take over at any time.
          </p>
          {chapter > 0 ? (
            <p className={styles.partway}>
              You’re starting at chapter {n} of {chapters.length}: {chapters[chapter]?.title}.
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={close}>
            Look around first
          </Button>
        </div>
        <span ref={notchRef} data-notch aria-hidden="true" className={styles.notch} />
      </section>
    </div>
  )
}
