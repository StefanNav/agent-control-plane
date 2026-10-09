import { create, type StoreApi, type UseBoundStore } from 'zustand'
import type { ScenarioId } from '../../data/scenarios'
import type { PersonaId } from '../../data/types'
import type { ActionHost, runActions } from './actions'
import {
  beatAt,
  chapterStart,
  enterStep,
  isInterlude,
  nextBeat,
  nextStep,
  prevStep,
  stepAt,
} from './engine'
import type { Chapter, Position, Timeline, TourAction } from './types'
import type { Voice } from './voice'

/** Closed, playing, paused, or paused because the visitor took over (driving). */
export type TourStatus = 'idle' | 'playing' | 'paused' | 'driving'

/** The speeds the bar offers (R3). */
export type TourRate = 1 | 1.25 | 1.5

/** What the player needs from the app: the tour, a voice, the demo store, the router and the page. */
export interface PlayerDeps {
  chapters: Chapter[]
  timeline: Timeline
  voice: Voice
  demo: { loadScenario(id: ScenarioId): void; setPersona(id: PersonaId): void; reset(): void }
  navigate(to: string): void
  /** Leave any story in progress; the tour replaces it. */
  exitStory(): void
  run: typeof runActions
  /** Scroll an element into view, clear of the bar. */
  reveal(el: HTMLElement): Promise<void>
  reducedMotion(): boolean
  /**
   * Resolves once the screen of step entry `stepKey` has rendered (at once if it already has), so a
   * step's first beat never acts on the outgoing screen (Ruling 10). Resolves, not rejects, on abort.
   */
  settle(stepKey: number, signal: AbortSignal): Promise<void>
}

export interface TourState {
  status: TourStatus
  pos: Position
  rate: TourRate
  captions: boolean
  /** The `data-story-target` outlined on screen. */
  outline: string | null
  card: { id: string; side: 'left' | 'right' } | null
  /** Visible only while playing, once the tour has moved it. */
  cursor: { x: number; y: number; visible: boolean; click: boolean }
  /** Bumped on every step entry; the shell keys its outlet by it (R6). */
  stepKey: number
  /** Every action skipped since the tour opened, as `kind:target`. */
  skipped: string[]
}

export interface TourControls {
  /** Open (or reopen) the tour at a chapter's first beat, playing or paused. */
  open(chapter: number, autoplay: boolean): void
  play(): void
  pause(): void
  /** The visitor is using the prototype: stop the tour's actions and hold its voice. */
  takeOver(): void
  /** After a take-over, restart the current step clean and play it from its first beat. */
  resume(): void
  next(): void
  prev(): void
  jump(chapter: number): void
  setRate(rate: TourRate): void
  toggleCaptions(): void
  /** Close the tour (R5). */
  exit(): void
}

/** How long the cursor takes to glide to a target at 1× (R3). */
const GLIDE_MS = 600

const HIDDEN_CURSOR: TourState['cursor'] = { x: 0, y: 0, visible: false, click: false }

/** Call a dep that returns a promise, so a synchronous throw arrives as a rejection. */
function attempt<T>(work: () => Promise<T>): Promise<T> {
  try {
    return work()
  } catch (error) {
    return Promise.reject(error)
  }
}

/** Wait out the cursor's glide; cut short if the run is aborted. */
function glide(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done)
  })
}

/**
 * The tour's player (not persisted; the URL is the persistence). It plays one beat at a time: the
 * beat's clip and its actions start together, and the beat ends when both are done. Then the next
 * beat, entering its step if it is a new one (R6), or the end (R5). A step's first beat waits for
 * the step's screen to settle (Ruling 10). Only one run is ever live: any entry, take-over or exit
 * aborts the current one, and a run's late writes are dropped.
 */
export function createTourPlayer(
  deps: PlayerDeps,
): UseBoundStore<StoreApi<TourState & TourControls>> {
  const { chapters, voice } = deps

  return create<TourState & TourControls>()((set, get) => {
    /** Names the live run; bumped whenever a run starts or is abandoned, so a stale run can tell. */
    let token = 0
    let controller: AbortController | null = null
    /**
     * The step's work: none, waiting for its screen, screen ready but paused before its first beat,
     * a beat in flight, or a beat finished while paused (waiting for Play).
     */
    let phase: 'none' | 'settling' | 'settled' | 'running' | 'done' = 'none'
    /** Has the tour moved the cursor since it opened? */
    let cursorMoved = false

    const withStatus = (status: TourStatus) => ({
      status,
      cursor: { ...get().cursor, visible: status === 'playing' && cursorMoved },
    })

    const hasChapter = (i: number) => Number.isInteger(i) && i >= 0 && i < chapters.length

    /** Abandon the current run: abort its actions and ignore anything it still reports. */
    const dropRun = () => {
      token++
      controller?.abort()
      controller = null
      phase = 'none'
    }

    /** Start new work under a fresh token and controller; whatever ran before can no longer write. */
    const claim = () => {
      controller = new AbortController()
      return { runToken: ++token, signal: controller.signal }
    }

    /**
     * Enter a step (R6): its scenario (always), its persona, its route; then a fresh outlet and
     * overlay. Its first beat starts once its screen has settled, if the tour is playing by then.
     */
    const enter = (pos: Position, status: TourStatus) => {
      const { load, persona, route } = enterStep(stepAt(chapters, pos))
      if (load) deps.demo.loadScenario(load)
      if (persona) deps.demo.setPersona(persona)
      deps.navigate(route)
      set((s) => ({
        ...withStatus(status),
        pos,
        stepKey: s.stepKey + 1,
        outline: null,
        card: null,
      }))
      const { runToken, signal } = claim()
      phase = 'settling'
      void attempt(() => deps.settle(get().stepKey, signal))
        .catch((error: unknown) => {
          if (!signal.aborted) console.warn('Tour: the step’s screen did not settle', error)
        })
        .then(() => {
          // Dropped while settling (next, take-over, exit…): that step's beat never starts.
          if (runToken !== token) return
          if (get().status === 'playing') startBeat(runToken, signal)
          else phase = 'settled'
        })
    }

    /** The overlay lent to one run; every write checks the run is still the live one. */
    const hostFor = (runToken: number, signal: AbortSignal): ActionHost => {
      const live = () => runToken === token
      return {
        setOutline: (target) => {
          if (live()) set({ outline: target })
        },
        outline: () => get().outline,
        reveal: (el) => (live() ? deps.reveal(el) : Promise.resolve()),
        setCard: (card) => {
          if (live()) set({ card })
        },
        moveCursor: (x, y, click) => {
          if (!live()) return Promise.resolve()
          cursorMoved = true
          set({ cursor: { x, y, click, visible: get().status === 'playing' } })
          return glide(deps.reducedMotion() ? 0 : GLIDE_MS / get().rate, signal)
        },
        rate: () => get().rate,
        reducedMotion: () => deps.reducedMotion(),
      }
    }

    /** Run a beat's actions; a host error is warned about and counts as done, so the tour never stalls on one. */
    const act = (
      actions: TourAction[],
      host: ActionHost,
      signal: AbortSignal,
    ): Promise<{ skipped: string[] }> =>
      attempt(() => deps.run(actions, host, signal)).catch((error: unknown) => {
        console.warn('Tour: a beat’s actions failed', error)
        return { skipped: [] }
      })

    /** Play the beat at `pos` under the given run: its clip and its actions together. */
    const startBeat = (runToken: number, signal: AbortSignal) => {
      phase = 'running'
      const { pos } = get()
      const beat = beatAt(chapters, pos)
      const spoken = voice.play(beat.id)
      const after = nextBeat(chapters, pos)
      if (after) voice.preload(beatAt(chapters, after).id)
      const acted = act(beat.actions ?? [], hostFor(runToken, signal), signal).then(
        ({ skipped }) => {
          if (runToken === token && skipped.length > 0)
            set((s) => ({ skipped: [...s.skipped, ...skipped] }))
        },
      )
      void Promise.all([spoken, acted]).then(() => {
        if (runToken !== token) return
        // Paused mid-beat: hold here, so nothing changes on screen until Play.
        if (get().status === 'playing') advance()
        else phase = 'done'
      })
    }

    /** After a finished beat: the next beat, entering its step if it is a new one, or the end. */
    const advance = () => {
      const { pos } = get()
      const after = nextBeat(chapters, pos)
      if (!after) return close()
      // Beat 0 is always a new step.
      if (after.beat === 0) return enter(after, 'playing')
      set({ pos: after })
      const { runToken, signal } = claim()
      startBeat(runToken, signal)
    }

    /** End or exit (R5): reset the demo, silence the voice, close; an interlude gives way to the landing page. */
    const close = () => {
      const { route } = stepAt(chapters, get().pos)
      dropRun()
      deps.demo.reset()
      voice.stop()
      cursorMoved = false
      set({
        status: 'idle',
        pos: chapterStart(0),
        outline: null,
        card: null,
        cursor: HIDDEN_CURSOR,
        skipped: [],
      })
      if (isInterlude(route)) deps.navigate('/')
    }

    /** Enter another step: still playing if it was, otherwise held there paused. */
    const goTo = (target: (pos: Position) => Position | null) => {
      const { status, pos } = get()
      if (status === 'idle') return
      const to = target(pos)
      if (!to) return
      dropRun()
      voice.stop()
      enter(to, status === 'playing' ? 'playing' : 'paused')
    }

    return {
      status: 'idle',
      pos: chapterStart(0),
      rate: 1,
      captions: true,
      outline: null,
      card: null,
      cursor: HIDDEN_CURSOR,
      stepKey: 0,
      skipped: [],

      open(chapter, autoplay) {
        if (!hasChapter(chapter)) return
        if (get().status === 'idle') deps.exitStory()
        dropRun()
        voice.stop()
        set({ skipped: [] })
        enter(chapterStart(chapter), autoplay ? 'playing' : 'paused')
      },
      play() {
        const { status } = get()
        if (status === 'driving') return get().resume()
        if (status !== 'paused') return
        set(withStatus('playing'))
        // While still settling, the settle starts the first beat.
        if (phase === 'settled' && controller) startBeat(token, controller.signal)
        else if (phase === 'running') voice.resume()
        else if (phase === 'done') advance()
      },
      pause() {
        if (get().status !== 'playing') return
        voice.pause()
        set(withStatus('paused'))
      },
      takeOver() {
        const { status } = get()
        if (status !== 'playing' && status !== 'paused') return
        dropRun()
        voice.pause()
        set(withStatus('driving'))
      },
      resume() {
        const { status, pos } = get()
        if (status === 'paused') return get().play()
        if (status !== 'driving') return
        voice.stop()
        // The current step's first beat: `pos` is in range and every step has a beat.
        enter({ chapter: pos.chapter, step: pos.step, beat: 0 }, 'playing')
      },
      next() {
        goTo((pos) => nextStep(chapters, pos))
      },
      prev() {
        goTo((pos) => prevStep(chapters, pos))
      },
      jump(chapter) {
        goTo(() => (hasChapter(chapter) ? chapterStart(chapter) : null))
      },
      setRate(rate) {
        voice.setRate(rate)
        set({ rate })
      },
      toggleCaptions() {
        set((s) => ({ captions: !s.captions }))
      },
      exit() {
        if (get().status !== 'idle') close()
      },
    }
  })
}
