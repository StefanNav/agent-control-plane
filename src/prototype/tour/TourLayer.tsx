import { useEffect, useEffectEvent, useReducer, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { elapsedMs, tourUrlAction } from './engine'
import { markScreen } from './screen'
import { TourBar } from './TourBar'
import { TourCard } from './TourCard'
import { TourCursor } from './TourCursor'
import type { TourStatus } from './player'
import { tourRuntime, type TourRuntime } from './useTour'

const SAFE_TARGET = /^[a-z0-9-]+$/

/** Form fields and controls: a key pressed on one is the visitor using the page. */
const CONTROL = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  // Any other widget the visitor can focus: table rows, charts (tabindex -1, as `main` and the page
  // heading have, is only for focus moved there by the app).
  '[tabindex]:not([tabindex="-1"])',
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

/** Inside the tour's own UI (the bar, a card, an image that opens larger)? */
function inTour(el: Element | null): boolean {
  return el?.closest('[data-tour]') != null
}

/**
 * Is this input the visitor using the page? Not inside the tour's UI, and not while the tour's own
 * dialog (an image card's full image) is open: that dialog takes every pointer and key until it closes.
 */
function onPage(el: Element | null): boolean {
  return !inTour(el) && document.querySelector('[data-tour="image"]') === null
}

/** Playing or paused: input on the page hands the tour over (spec §4.5, Ruling 12). */
function handsOver(status: TourStatus): boolean {
  return status === 'playing' || status === 'paused'
}

function isControl(el: Element | null): boolean {
  return el?.closest(CONTROL) != null
}

/**
 * Keep `?tour=` and the player in step (spec §4.1, R2): a link opens its chapter paused, an unknown
 * chapter is stripped, the URL names the chapter while the tour is open (a product link that drops it
 * gets it back), and closing drops it. A navigation on its way (the player's, or a story's that closed
 * the tour) is left to land first, so a URL write never races one and undoes it.
 */
function useTourUrl(runtime: TourRuntime) {
  const { player, chapters, bindNavigate } = runtime
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const status = player((s) => s.status)
  const chapter = player((s) => s.pos.chapter)
  /** Was the tour open at the last sync? */
  const wasOpen = useRef(false)

  useEffect(() => bindNavigate((to) => navigate(to)), [bindNavigate, navigate])

  // Every navigation lands with a new key.
  useEffect(() => {
    runtime.navigationLanded()
  }, [runtime, location.key])

  const sync = useEffectEvent(() => {
    if (runtime.isNavigating()) return
    // The player's state now, not this render's: a sibling's effect may have just closed the tour.
    const now = player.getState()
    const open = now.status !== 'idle'
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
      const id = chapters[now.pos.chapter]?.id
      if (id === undefined || current === id) return
      // A navigation the tour didn't make that names another chapter: go there (Ruling 16). The
      // chapter's own navigation then lands, and the next sync names it.
      const asked = current === null ? -1 : chapters.findIndex((c) => c.id === current)
      if (asked >= 0) player.getState().jump(asked)
      // Dropped by a product link, or unknown: name the current chapter again.
      else write(id)
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
 * or a key on a control outside the tour's UI while it plays or is paused is a take-over (Ruling 12);
 * a hidden tab pauses; and the layer going away pauses and silences the voice.
 */
function useTourInput({ player, voice }: TourRuntime) {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!handsOver(player.getState().status)) return
      if (!onPage(elementOf(event.target))) return
      player.getState().takeOver()
    }
    // Capture, so a page that stops a key's propagation can't hide it.
    const onKeyCapture = (event: KeyboardEvent) => {
      if (!handsOver(player.getState().status) || PASSIVE_KEYS.has(event.key)) return
      const target = elementOf(event.target)
      if (!onPage(target) || !isControl(target)) return
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
  const { pathname, search } = useLocation()
  useEffect(() => {
    markScreen(stepKey, pathname + search)
  }, [stepKey, pathname, search])
  return children
}
