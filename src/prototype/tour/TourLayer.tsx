import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { beatAt, elapsedMs, isInterlude, stepAt, tourUrlAction } from './engine'
import { markScreen, prefersReducedMotion } from './screen'
import { TourBar } from './TourBar'
import { TourCard } from './TourCard'
import { TourCursor } from './TourCursor'
import { tourMinutes } from './tourMinutes'
import { TourWelcome } from './TourWelcome'
import { AttuneSplash } from '../AttuneMark'
import type { TourStatus } from './player'
import type { Chapter, Position } from './types'
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

/** Is the tour at a step on one of its own pages (an interlude), not a product screen? */
function onInterlude(chapters: Chapter[], pos: Position): boolean {
  return isInterlude(stepAt(chapters, pos).route)
}

function isControl(el: Element | null): boolean {
  return el?.closest(CONTROL) != null
}

/**
 * Keep `?tour=` and the player in step (spec §4.1, R2): a link opens its chapter paused (with the
 * welcome on the page's first location: a fresh load, a refresh, a shared link), an unknown
 * chapter is stripped, the URL names the chapter while the tour is open (a product link that drops
 * it gets it back), and closing drops it. Back and Forward never open the tour or move it
 * (Ruling 38): closed, a chapter reached that way is dropped from the URL; open, it is a take-over
 * where the tour is. A navigation on its way (the player's, or a story's that closed the tour) is
 * left to land first, so a URL write never races one and undoes it.
 */
function useTourUrl(runtime: TourRuntime) {
  const { player, chapters, bindNavigate } = runtime
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [params, setParams] = useSearchParams()
  const status = player((s) => s.status)
  const chapter = player((s) => s.pos.chapter)
  /** Was the tour open at the last sync? */
  const wasOpen = useRef(false)
  /** The location the last sync saw, so a sync for a status change isn't taken for an arrival. */
  const lastKey = useRef<string | null>(null)

  useEffect(() => bindNavigate((to) => navigate(to)), [bindNavigate, navigate])

  // Every navigation lands with a new key.
  useEffect(() => {
    runtime.navigationLanded()
  }, [runtime, location.key])

  const sync = useEffectEvent(() => {
    const arrived = lastKey.current !== location.key
    lastKey.current = location.key
    // Asked of every location, so the runtime knows when the page has left the one it loaded on.
    const first = runtime.isFirstLocation(location.key)
    // Reached by Back or Forward: a POP, and not the location the page loaded on (that reports POP
    // too). It stays so for every sync here, until the next navigation lands.
    const popped = navigationType === 'POP' && !first
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
      // Back or Forward is the visitor driving: a take-over where the tour is, never a jump. So is
      // leaving the tour's own page, where input only paused it (Ruling 41). Once, on arrival: a
      // later sync here is for a status change (Resume, say).
      const left =
        onInterlude(chapters, now.pos) && location.pathname !== stepAt(chapters, now.pos).route
      if (arrived && (popped || left)) now.takeOver()
      const id = chapters[now.pos.chapter]?.id
      if (id === undefined || current === id) return
      // A link the visitor followed that names another chapter: go there (Ruling 16). The
      // chapter's own navigation then lands, and the next sync names it.
      const asked = popped || current === null ? -1 : chapters.findIndex((c) => c.id === current)
      if (asked >= 0) player.getState().jump(asked)
      // Dropped by a product link, unknown, or another chapter's reached by Back: name the current
      // chapter again.
      else write(id)
    } else if (closed) {
      if (current !== null) write(null)
    } else {
      const action = tourUrlAction(params, chapters)
      // Back or Forward onto a chapter's link leaves the tour closed, and drops it from the URL, so
      // nothing that keeps the query (a tab, a dialog) carries it on.
      if (action.kind === 'strip' || (action.kind === 'open' && popped)) write(null)
      // A link that loaded the page lands a visitor on a busy screen: the welcome points them at
      // Play. One followed inside the app (About's Play from here) needs none.
      else if (action.kind === 'open')
        player.getState().open(action.chapter, false, { welcome: first })
    }
  })
  useEffect(() => {
    sync()
  }, [location.key, status, chapter])
}

/**
 * The visitor's input while the tour is open (spec §4.5, §4.6, Review focus 4): Space plays and
 * pauses and ←/→ step, unless focus is on a control (the bar's own are fine for ←/→) or a dialog is
 * open (Ruling 32); a pointer down or a key on a control outside the tour's UI while it plays or is
 * paused is a take-over on a product screen (Ruling 12), and on the tour's own pages a pause, so Play
 * carries on from the line (Ruling 41); a hidden tab pauses; and the layer going away pauses and
 * silences the voice.
 */
function useTourInput({ player, voice, chapters }: TourRuntime) {
  useEffect(() => {
    /** The visitor is using the page while the tour plays or is paused. */
    const visitorActs = () => {
      const { status, pos, pause, takeOver, dismissWelcome } = player.getState()
      // Even where input only pauses (or, paused, changes nothing), the visitor has moved on.
      dismissWelcome()
      // An interlude has no product state a beat could act on wrongly: hold the line, don't drop it.
      if (!onInterlude(chapters, pos)) takeOver()
      else if (status === 'playing') pause()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!handsOver(player.getState().status)) return
      if (!onPage(elementOf(event.target))) return
      visitorActs()
    }
    // Capture, so a page that stops a key's propagation can't hide it.
    const onKeyCapture = (event: KeyboardEvent) => {
      if (!handsOver(player.getState().status) || PASSIVE_KEYS.has(event.key)) return
      const target = elementOf(event.target)
      if (!onPage(target) || !isControl(target)) return
      visitorActs()
    }
    const onKey = (event: KeyboardEvent) => {
      const { status, play, pause, next, prev } = player.getState()
      if (status === 'idle' || event.defaultPrevented) return
      // An open dialog owns the keyboard: its arrows and Space are never the tour's (Ruling 32).
      if (document.querySelector('[role="dialog"]') !== null) return
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
  }, [player, voice, chapters])

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
 * the outline, the cursor, the current card, the welcome (until the visitor starts) and the player
 * bar.
 */
export function TourLayer() {
  const runtime = tourRuntime()
  useTourUrl(runtime)
  useTourInput(runtime)
  const welcomeBody = useId()
  const { player, chapters, manifest, timeline, cards, voice } = runtime
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
      welcome: s.welcome,
    })),
  )
  useTicking(state.status === 'playing')
  // One function for the life of the voice, so the meter's frame loop isn't restarted every tick.
  const currentMs = useCallback(() => voice.currentMs(), [voice])
  if (state.status === 'idle') return null

  const controls = player.getState()
  const beatId = beatAt(chapters, state.pos).id
  const card = state.card ? cards[state.card.id] : undefined
  const welcoming = state.status === 'paused' && state.welcome
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
      {/* Before the bar, so Shift+Tab from Play tour reaches Look around first. */}
      <TourWelcome
        open={welcoming}
        bodyId={welcomeBody}
        chapters={chapters}
        chapter={state.pos.chapter}
        minutes={tourMinutes(timeline.total)}
        onDismiss={controls.dismissWelcome}
      />
      {/* A link's first screen opens behind Attune's full-page welcome, in a fresh session. */}
      <AttuneSplash show={welcoming} />
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
        meter={{
          levels: manifest[beatId]?.levels ?? '',
          clipMs: timeline.beatMs[beatId] ?? 0,
          currentMs,
          // Read as the bar renders (every tick while playing), so a change in the setting follows.
          reducedMotion: prefersReducedMotion(),
        }}
        welcome={welcoming ? welcomeBody : undefined}
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
