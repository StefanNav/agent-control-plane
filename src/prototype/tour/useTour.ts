import type { StoreApi, UseBoundStore } from 'zustand'
import { useDemo } from '../../store'
import { useStory } from '../stories/progress'
import { runActions } from './actions'
import { CARDS, type CardContent } from './cards'
import { buildTimeline, stepAt } from './engine'
import { clipUrl, MANIFEST } from './manifest'
import { createTourPlayer, type TourControls, type TourState } from './player'
import { prefersReducedMotion, revealClear, routePathname, settleScreen } from './screen'
import { CHAPTERS } from './script'
import type { Chapter, Manifest, Timeline } from './types'
import { createAudioVoice, createSilentVoice, type Voice } from './voice'

/** The player bar's height; the shell leaves this much room under the page while the tour is open (R4). */
export const TOUR_BAR_HEIGHT = 88

export type TourPlayer = UseBoundStore<StoreApi<TourState & TourControls>>

/** The tour wired to the app: its script, timings, cards, voice and player. */
export interface TourRuntime {
  chapters: Chapter[]
  timeline: Timeline
  cards: Record<string, CardContent>
  voice: Voice
  player: TourPlayer
  /** Hand the player the router's navigate (TourLayer, on mount); returns the unbind. */
  bindNavigate(fn: (to: string) => void): () => void
}

export interface TourRuntimeOptions {
  /** `silent` plays timers instead of clips (`?tourVoice=silent`, tests). Default `audio`. */
  voice?: 'audio' | 'silent'
  cards?: Record<string, CardContent>
}

/**
 * Build the tour's player with the real app behind it: the demo store, the story store, the action
 * runner, and the page (reveal, reduced motion, the step's screen settling). Navigation goes to
 * whichever router `bindNavigate` was given last; with none bound it does nothing.
 */
export function createTourRuntime(
  chapters: Chapter[],
  manifest: Manifest,
  options: TourRuntimeOptions = {},
): TourRuntime {
  const timeline = buildTimeline(chapters, manifest)
  const msFor = (beatId: string) => timeline.beatMs[beatId] ?? 0
  const voice =
    options.voice === 'silent' ? createSilentVoice(msFor) : createAudioVoice(msFor, clipUrl)
  let navigateTo: ((to: string) => void) | null = null
  const player: TourPlayer = createTourPlayer({
    chapters,
    timeline,
    voice,
    demo: {
      loadScenario: (id) => useDemo.getState().loadScenario(id),
      setPersona: (id) => useDemo.getState().setPersona(id),
      reset: () => useDemo.getState().reset(),
    },
    navigate: (to) => navigateTo?.(to),
    exitStory: () => useStory.getState().exit(),
    run: runActions,
    reveal: (el) =>
      revealClear(el, document.querySelector('[data-tour="bar"]'), prefersReducedMotion()),
    reducedMotion: prefersReducedMotion,
    settle: (stepKey, signal) =>
      settleScreen(
        stepKey,
        routePathname(stepAt(chapters, player.getState().pos).route),
        signal,
      ),
  })
  return {
    chapters,
    timeline,
    cards: options.cards ?? CARDS,
    voice,
    player,
    bindNavigate(fn) {
      navigateTo = fn
      return () => {
        if (navigateTo === fn) navigateTo = null
      }
    },
  }
}

let runtime: TourRuntime | null = null

/** The app's tour, made on first use; `?tourVoice=silent` in the first URL picks the silent voice. */
export function tourRuntime(): TourRuntime {
  runtime ??= createTourRuntime(CHAPTERS, MANIFEST, {
    voice:
      new URLSearchParams(window.location.search).get('tourVoice') === 'silent'
        ? 'silent'
        : 'audio',
  })
  return runtime
}

/** Tests: use this runtime instead of the app's; null goes back to making it on first use. */
export function setTourRuntime(next: TourRuntime | null): void {
  runtime = next
}

/** Read the tour's state (a Zustand selector on the app's player). */
export function useTour<T>(selector: (state: TourState & TourControls) => T): T {
  return tourRuntime().player(selector)
}

/** Is the tour open (playing, paused or driving)? */
export function useTourOpen(): boolean {
  return useTour((s) => s.status !== 'idle')
}

/** Point the player's navigation at a router; returns the unbind. */
export function bindNavigate(fn: (to: string) => void): () => void {
  return tourRuntime().bindNavigate(fn)
}

/** Call inside a Play or Resume click, before playing, so the browser lets the clips play (Ruling 11). */
export function unlockVoice(): void {
  tourRuntime().voice.unlock()
}
