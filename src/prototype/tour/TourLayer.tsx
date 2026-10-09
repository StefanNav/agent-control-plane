import { useEffect, useEffectEvent, useReducer, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { elapsedMs, tourUrlAction } from './engine'
import { markScreen } from './screen'
import { TourBar } from './TourBar'
import { TourCard } from './TourCard'
import { TourCursor } from './TourCursor'
import { tourRuntime, type TourRuntime } from './useTour'

const SAFE_TARGET = /^[a-z0-9-]+$/

/** Form fields and controls: a key pressed on one is the visitor using the page. */
const CONTROL = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[contenteditable]:not([contenteditable="false"])',
  ...[
    'button',
    'link',
    'menuitem',
    'option',
    'tab',
    'checkbox',
    'radio',
    'switch',
    'slider',
    'spinbutton',
    'combobox',
    'textbox',
  ].map((role) => `[role="${role}"]`),
].join(', ')

/** Keys that only move focus or modify another key: pressing them isn't using the page. */
const PASSIVE_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])

/** How often the bar's time and progress move while the tour plays. */
const TICK_MS = 250

function elementOf(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null
}

/** Inside the tour's own UI (the bar, a card)? */
function inTour(el: Element | null): boolean {
  return el?.closest('[data-tour]') != null
}

function isControl(el: Element | null): boolean {
  return el?.closest(CONTROL) != null
}

/**
 * Keep `?tour=` and the player in step (spec §4.1, R2): a link opens its chapter paused, an unknown
 * chapter is stripped, the URL names the chapter while the tour is open (a product link that drops it
 * gets it back), and closing drops it. The player's own navigations are left to land first, so a
 * URL write never races one and undoes it.
 */
function useTourUrl({ player, chapters, bindNavigate }: TourRuntime) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const status = player((s) => s.status)
  const chapter = player((s) => s.pos.chapter)
  /** The player asked for a navigation that hasn't landed: the URL is about to change. */
  const pending = useRef(false)
  /** Was the tour open at the last sync? */
  const wasOpen = useRef(false)

  useEffect(
    () =>
      bindNavigate((to) => {
        pending.current = true
        navigate(to)
      }),
    [bindNavigate, navigate],
  )

  // Every navigation lands with a new key.
  useEffect(() => {
    pending.current = false
  }, [location.key])

  const sync = useEffectEvent(() => {
    if (pending.current) return
    const open = status !== 'idle'
    const closed = wasOpen.current && !open
    wasOpen.current = open
    const current = params.get('tour')
    const write = (value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === null) next.delete('tour')
          else next.set('tour', value)
          return next
        },
        { replace: true },
      )
    if (open) {
      const id = chapters[chapter]?.id
      if (id !== undefined && current !== id) write(id)
    } else if (closed) {
      if (current !== null) write(null)
    } else {
      const action = tourUrlAction(params, chapters)
      if (action.kind === 'strip') write(null)
      if (action.kind === 'open') player.getState().open(action.chapter, false)
    }
  })
  useEffect(() => {
    sync()
  }, [location.key, status, chapter])
}

/**
 * The visitor's input while the tour is open (spec §4.5, §4.6, Review focus 4): Space plays and
 * pauses and ←/→ step, unless focus is on a control (the bar's own are fine for ←/→); a pointer down
 * or a key on a control outside the tour's UI while it plays is a take-over; a hidden tab pauses; and
 * the layer going away pauses and silences the voice.
 */
function useTourInput({ player, voice }: TourRuntime) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (player.getState().status !== 'playing') return
      if (inTour(elementOf(event.target))) return
      player.getState().takeOver()
    }
    // Capture, so a page that stops a key's propagation can't hide it.
    const onKeyCapture = (event: KeyboardEvent) => {
      if (player.getState().status !== 'playing' || PASSIVE_KEYS.has(event.key)) return
      const target = elementOf(event.target)
      if (inTour(target) || !isControl(target)) return
      player.getState().takeOver()
    }
    const onKey = (event: KeyboardEvent) => {
      const { status, play, pause, next, prev } = player.getState()
      if (status === 'idle' || event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = elementOf(event.target)
      const control = isControl(target)
      if (event.key === ' ' && !control) {
        event.preventDefault()
        if (status === 'playing') return pause()
        voice.unlock()
        play()
      } else if (
        (event.key === 'ArrowRight' || event.key === 'ArrowLeft') &&
        (!control || inTour(target))
      ) {
        event.preventDefault()
        if (event.key === 'ArrowRight') next()
        else prev()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') player.getState().pause()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyCapture, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyCapture, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [player, voice])

  useEffect(
    () => () => {
      player.getState().pause()
      voice.stop()
    },
    [player, voice],
  )
}

/** Re-render every tick while the tour plays, so the bar's time and progress move. */
function useTicking(active: boolean) {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [active])
}

/**
 * The tour layer of the app and prototype shells: URL sync and input always; while the tour is open,
 * the outline, the cursor, the current card and the player bar.
 */
export function TourLayer() {
  const runtime = tourRuntime()
  useTourUrl(runtime)
  useTourInput(runtime)
  const { player, chapters, timeline, cards, voice } = runtime
  const state = player(
    useShallow((s) => ({
      status: s.status,
      pos: s.pos,
      rate: s.rate,
      captions: s.captions,
      outline: s.outline,
      card: s.card,
      cursor: s.cursor,
      clicks: s.clicks,
      skipped: s.skipped.length,
    })),
  )
  useTicking(state.status === 'playing')
  if (state.status === 'idle') return null

  const controls = player.getState()
  const card = state.card ? cards[state.card.id] : undefined
  return (
    <>
      {state.outline && SAFE_TARGET.test(state.outline) ? (
        <style>{`[data-story-target="${state.outline}"] { outline: 2px solid var(--cs-ink); outline-offset: 2px; }`}</style>
      ) : null}
      {state.card && card ? (
        <TourCard
          key={state.card.id}
          content={card}
          side={state.card.side}
          playing={state.status === 'playing'}
          onPause={controls.pause}
        />
      ) : null}
      <TourBar
        chapters={chapters}
        timeline={timeline}
        status={state.status}
        pos={state.pos}
        rate={state.rate}
        captions={state.captions}
        elapsed={elapsedMs(timeline, chapters, state.pos, voice.currentMs())}
        skipped={state.skipped}
        controls={controls}
        unlock={() => voice.unlock()}
      />
      <TourCursor
        x={state.cursor.x}
        y={state.cursor.y}
        visible={state.cursor.visible}
        clicks={state.clicks}
        rate={state.rate}
      />
    </>
  )
}

/**
 * The page's wrapper in the shell. Keyed by `stepKey` while the tour is open, so every step entry
 * mounts a fresh screen (R6); it reports each mount and route to the step's settle (Ruling 10).
 */
export function TourScreen({ stepKey, children }: { stepKey: number; children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => {
    markScreen(stepKey, pathname)
  }, [stepKey, pathname])
  return children
}
