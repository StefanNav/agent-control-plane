import type { ScenarioId } from '../../data/scenarios'
import type { PersonaId } from '../../data/types'
import type { ActionHost, runActions } from './actions'
import { buildTimeline } from './engine'
import { FIXTURE_CHAPTERS } from './fixtures'
import { createTourPlayer, type PlayerDeps } from './player'
import type { Chapter, TourAction } from './types'
import type { Voice } from './voice'

/** The fixture tour plus a closing chapter on an interlude: four steps, the last one at `/tour/end`. */
const TOUR: Chapter[] = [
  ...FIXTURE_CHAPTERS,
  {
    id: 'your-turn',
    title: 'Your turn',
    steps: [
      {
        id: 'your-turn-end',
        route: '/tour/end',
        beats: [
          {
            id: 'your-turn-1',
            text: 'Now it is your turn.',
            actions: [{ kind: 'outline', target: 'story-cards' }],
          },
        ],
      },
    ],
  },
]

/** A voice whose clip ends when the test says so, or when `stop()` or another `play()` cuts it short (the contract). */
function makeVoice() {
  let current: (() => void) | null = null
  const end = () => {
    const finish = current
    current = null
    finish?.()
  }
  const voice = {
    play: vi.fn<Voice['play']>(() => {
      end()
      return new Promise<void>((resolve) => {
        current = resolve
      })
    }),
    pause: vi.fn<Voice['pause']>(),
    resume: vi.fn<Voice['resume']>(),
    stop: vi.fn<Voice['stop']>(end),
    setRate: vi.fn<Voice['setRate']>(),
    currentMs: () => 0,
    preload: vi.fn<Voice['preload']>(),
  }
  return { voice, finish: end }
}

interface RunCall {
  actions: TourAction[]
  host: ActionHost
  signal: AbortSignal
  done(skipped?: string[]): void
  fail(error: Error): void
}

/** A runner that records each call and finishes only when the test says so. */
function makeRun() {
  const calls: RunCall[] = []
  const run = vi.fn<typeof runActions>(
    (actions, host, signal) =>
      new Promise((resolve, reject) => {
        calls.push({
          actions,
          host,
          signal,
          done: (skipped = []) => resolve({ skipped }),
          fail: reject,
        })
      }),
  )
  return { run, calls }
}

function setup(chapters: Chapter[] = FIXTURE_CHAPTERS, reducedMotion = true) {
  const log: string[] = []
  const { voice, finish } = makeVoice()
  const { run, calls } = makeRun()
  const demo = {
    /** What the hospital already shows; the player must load a step's scenario regardless. */
    scenario: 'baseline' as ScenarioId,
    loadScenario: vi.fn((id: ScenarioId) => {
      log.push(`load:${id}`)
      demo.scenario = id
    }),
    setPersona: vi.fn((id: PersonaId) => void log.push(`persona:${id}`)),
    reset: vi.fn(() => void log.push('reset')),
  }
  const navigate = vi.fn((to: string) => void log.push(`navigate:${to}`))
  const exitStory = vi.fn()
  const reveal = vi.fn(async () => {})
  const deps: PlayerDeps = {
    chapters,
    timeline: buildTimeline(chapters, {}),
    voice,
    demo,
    navigate,
    exitStory,
    run,
    reveal,
    reducedMotion: () => reducedMotion,
  }
  const player = createTourPlayer(deps)
  return {
    player,
    state: () => player.getState(),
    voice,
    finish,
    run,
    calls,
    lastCall: () => calls[calls.length - 1]!,
    demo,
    navigate,
    exitStory,
    reveal,
    log,
  }
}

/** Let settled promises run their callbacks. */
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

/** Finish the current beat: its clip and its actions. */
async function finishBeat(t: ReturnType<typeof setup>) {
  t.finish()
  t.lastCall().done()
  await flush()
}

/** Track a promise so a test can tell whether it has settled yet. */
function track(promise: Promise<void>) {
  const state = { done: false }
  void promise.then(() => {
    state.done = true
  })
  return state
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('starts closed, at the first beat, at 1×, with captions on', () => {
  const { state } = setup()
  expect(state()).toMatchObject({
    status: 'idle',
    pos: { chapter: 0, step: 0, beat: 0 },
    rate: 1,
    captions: true,
    outline: null,
    card: null,
    cursor: { x: 0, y: 0, visible: false, click: false },
    stepKey: 0,
    skipped: [],
  })
})

describe('open', () => {
  test('open(0, false) enters the first step paused and leaves any story', () => {
    const t = setup()
    t.state().open(0, false)
    expect(t.state().status).toBe('paused')
    expect(t.state().pos).toEqual({ chapter: 0, step: 0, beat: 0 })
    expect(t.navigate).toHaveBeenCalledWith('/tour/why')
    expect(t.state().stepKey).toBe(1)
    expect(t.exitStory).toHaveBeenCalledTimes(1)
    // An interlude has no scenario or persona; nothing plays until Play.
    expect(t.demo.loadScenario).not.toHaveBeenCalled()
    expect(t.demo.setPersona).not.toHaveBeenCalled()
    expect(t.voice.play).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()
  })

  test('entering a step loads its scenario even when it is already loaded, then the persona, then the route (R6)', () => {
    const t = setup()
    t.demo.scenario = 'baseline'
    t.state().open(1, false)
    expect(t.log).toEqual(['load:baseline', 'persona:priya', 'navigate:/operations'])
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
  })

  test('leaves the story once per opening, not on a reopen while open', () => {
    const t = setup()
    t.state().open(0, false)
    t.state().open(1, false)
    expect(t.exitStory).toHaveBeenCalledTimes(1)
    t.state().exit()
    t.state().open(0, false)
    expect(t.exitStory).toHaveBeenCalledTimes(2)
  })

  test('open(chapter, true) plays from the chapter’s first beat', () => {
    const t = setup()
    t.state().open(1, true)
    expect(t.state().status).toBe('playing')
    expect(t.voice.play).toHaveBeenCalledWith('decision-1-screen-1')
    expect(t.lastCall().actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)
  })

  test('a chapter that does not exist is ignored', () => {
    const t = setup()
    t.state().open(2, false)
    t.state().open(-1, true)
    expect(t.state().status).toBe('idle')
    expect(t.exitStory).not.toHaveBeenCalled()
    expect(t.navigate).not.toHaveBeenCalled()
  })
})

describe('playing beats', () => {
  test('play() starts beat 0’s voice and actions together; the beat ends only when both are done', async () => {
    const t = setup()
    t.state().open(1, false)
    t.state().play()
    expect(t.state().status).toBe('playing')
    expect(t.voice.play).toHaveBeenCalledTimes(1)
    expect(t.voice.play).toHaveBeenLastCalledWith('decision-1-screen-1')
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.calls[0]!.actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)

    t.finish()
    await flush()
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 0 })

    t.calls[0]!.done()
    await flush()
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 1 })
    expect(t.voice.play).toHaveBeenLastCalledWith('decision-1-screen-2')
    expect(t.lastCall().actions).toEqual([{ kind: 'clearCard' }])
  })

  test('actions finishing first do not end the beat either', async () => {
    const t = setup()
    t.state().open(1, true)
    t.calls[0]!.done()
    await flush()
    expect(t.state().pos.beat).toBe(0)
    t.finish()
    await flush()
    expect(t.state().pos.beat).toBe(1)
  })

  test('a beat with no actions still goes through the runner, with none', () => {
    const t = setup()
    t.state().open(0, true)
    expect(t.calls[0]!.actions).toEqual([])
  })

  test('each beat preloads the next one’s clip, across steps; the last beat preloads nothing', async () => {
    const t = setup()
    t.state().open(0, true)
    expect(t.voice.preload).toHaveBeenLastCalledWith('why-intro-2')
    await finishBeat(t)
    await finishBeat(t)
    expect(t.voice.preload).toHaveBeenLastCalledWith('why-screen-1')
    t.state().jump(1)
    expect(t.voice.preload).toHaveBeenLastCalledWith('decision-1-screen-2')
    t.voice.preload.mockClear()
    await finishBeat(t)
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 1 })
    expect(t.voice.preload).not.toHaveBeenCalled()
  })

  test('crossing a step boundary enters the new step', async () => {
    const t = setup()
    t.state().open(0, true)
    t.lastCall().host.setOutline('gap-owner')
    t.lastCall().host.setCard({ id: 'decision-1', side: 'left' })
    await finishBeat(t)
    await finishBeat(t)
    expect(t.state().stepKey).toBe(1)
    await finishBeat(t)
    expect(t.state()).toMatchObject({
      status: 'playing',
      pos: { chapter: 0, step: 1, beat: 0 },
      stepKey: 2,
      outline: null,
      card: null,
    })
    expect(t.log.slice(-3)).toEqual([
      'load:med-rec-paused',
      'persona:marcus',
      'navigate:/operations/agents/med-rec',
    ])
    expect(t.voice.play).toHaveBeenLastCalledWith('why-screen-1')

    await finishBeat(t)
    await finishBeat(t)
    expect(t.state()).toMatchObject({ pos: { chapter: 1, step: 0, beat: 0 }, stepKey: 3 })
    expect(t.demo.loadScenario).toHaveBeenCalledTimes(2)
    expect(t.demo.loadScenario).toHaveBeenLastCalledWith('baseline')
  })

  test('finishing the last beat closes the tour and stays on a product route (R5)', async () => {
    const t = setup()
    t.state().open(1, true)
    t.voice.stop.mockClear()
    await finishBeat(t)
    await finishBeat(t)
    expect(t.demo.reset).toHaveBeenCalledTimes(1)
    expect(t.voice.stop).toHaveBeenCalled()
    expect(t.state().status).toBe('idle')
    expect(t.navigate).not.toHaveBeenCalledWith('/')
    expect(t.run).toHaveBeenCalledTimes(2)
  })

  test('finishing the last beat on an interlude goes to the landing page (R5)', async () => {
    const t = setup(TOUR)
    t.state().open(2, true)
    await finishBeat(t)
    expect(t.demo.reset).toHaveBeenCalledTimes(1)
    expect(t.state().status).toBe('idle')
    expect(t.navigate).toHaveBeenLastCalledWith('/')
  })

  test('play() twice runs one beat', () => {
    const t = setup()
    t.state().open(1, false)
    t.state().play()
    t.state().play()
    expect(t.voice.play).toHaveBeenCalledTimes(1)
    expect(t.run).toHaveBeenCalledTimes(1)
  })

  test('play() while closed does nothing', () => {
    const t = setup()
    t.state().play()
    expect(t.state().status).toBe('idle')
    expect(t.voice.play).not.toHaveBeenCalled()
  })

  test('actions that fail are warned about once and count as done', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = setup()
    t.state().open(1, true)
    t.calls[0]!.fail(new Error('reveal broke'))
    await flush()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(t.state().pos.beat).toBe(0)
    t.finish()
    await flush()
    expect(t.state().pos.beat).toBe(1)
  })

  test('skipped actions add up across runs, and clear on open and on exit', async () => {
    const t = setup()
    t.state().open(1, true)
    t.lastCall().done(['outline:a'])
    t.finish()
    await flush()
    t.lastCall().done(['click:b'])
    await flush()
    expect(t.state().skipped).toEqual(['outline:a', 'click:b'])

    t.state().open(1, false)
    expect(t.state().skipped).toEqual([])
    t.state().play()
    t.lastCall().done(['outline:a'])
    await flush()
    expect(t.state().skipped).toEqual(['outline:a'])
    t.state().exit()
    expect(t.state().skipped).toEqual([])
  })
})

describe('pause', () => {
  test('pause() holds the voice only; running actions finish and the beat ends after play()', async () => {
    const t = setup()
    t.state().open(1, true)
    const { host, signal } = t.calls[0]!
    t.state().pause()
    expect(t.state().status).toBe('paused')
    expect(t.voice.pause).toHaveBeenCalledTimes(1)
    expect(signal.aborted).toBe(false)

    host.setCard({ id: 'decision-1', side: 'left' })
    expect(t.state().card).toEqual({ id: 'decision-1', side: 'left' })
    t.calls[0]!.done()
    await flush()
    expect(t.state().pos.beat).toBe(0)

    t.state().play()
    expect(t.voice.resume).toHaveBeenCalledTimes(1)
    expect(t.state().status).toBe('playing')
    expect(t.voice.play).toHaveBeenCalledTimes(1)
    t.finish()
    await flush()
    expect(t.state().pos.beat).toBe(1)
  })

  test('a beat that finishes while paused waits there for play()', async () => {
    const t = setup()
    t.state().open(1, true)
    t.finish()
    t.state().pause()
    t.calls[0]!.done()
    await flush()
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(t.voice.play).toHaveBeenCalledTimes(1)

    t.state().play()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 1 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('decision-1-screen-2')
  })

  test('the cursor hides while paused and shows again on play()', () => {
    const t = setup()
    t.state().open(1, true)
    void t.calls[0]!.host.moveCursor(10, 20, true)
    expect(t.state().cursor).toEqual({ x: 10, y: 20, visible: true, click: true })
    t.state().pause()
    expect(t.state().cursor.visible).toBe(false)
    t.state().play()
    expect(t.state().cursor).toEqual({ x: 10, y: 20, visible: true, click: true })
  })

  test('the cursor stays hidden until the tour first moves it', () => {
    const t = setup()
    t.state().open(1, true)
    expect(t.state().cursor.visible).toBe(false)
  })
})

describe('cursor glide', () => {
  test('moveCursor resolves after 600 ms ÷ rate', async () => {
    vi.useFakeTimers()
    const t = setup(FIXTURE_CHAPTERS, false)
    t.state().open(1, true)
    t.state().setRate(1.5)
    const glided = track(t.calls[0]!.host.moveCursor(1, 2, false))
    await vi.advanceTimersByTimeAsync(399)
    expect(glided.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(glided.done).toBe(true)
  })

  test('under reduced motion the cursor jumps', async () => {
    vi.useFakeTimers()
    const t = setup(FIXTURE_CHAPTERS, true)
    t.state().open(1, true)
    const glided = track(t.calls[0]!.host.moveCursor(1, 2, false))
    await flush()
    expect(glided.done).toBe(true)
  })

  test('an aborted run stops waiting for its glide', async () => {
    vi.useFakeTimers()
    const t = setup(FIXTURE_CHAPTERS, false)
    t.state().open(1, true)
    const glided = track(t.calls[0]!.host.moveCursor(1, 2, false))
    t.state().exit()
    await flush()
    expect(glided.done).toBe(true)
  })
})

describe('take over and resume', () => {
  test('takeOver() while playing hands the screen over: driving, voice paused, actions aborted, cursor hidden', async () => {
    const t = setup()
    t.state().open(1, true)
    void t.calls[0]!.host.moveCursor(10, 20, true)
    await finishBeat(t)
    const { host, signal } = t.lastCall()
    t.state().takeOver()
    expect(t.state().status).toBe('driving')
    expect(t.voice.pause).toHaveBeenCalledTimes(1)
    expect(signal.aborted).toBe(true)
    expect(t.state().cursor.visible).toBe(false)

    host.setOutline('agent-summary')
    expect(t.state().outline).toBeNull()
  })

  test('resume() restarts the step clean and plays it from its first beat (Review focus 3)', async () => {
    const t = setup()
    t.state().open(1, true)
    await finishBeat(t)
    expect(t.state().pos.beat).toBe(1)
    t.state().takeOver()
    const stepKey = t.state().stepKey
    t.log.length = 0

    t.state().resume()
    expect(t.log).toEqual(['load:baseline', 'persona:priya', 'navigate:/operations'])
    expect(t.state()).toMatchObject({
      status: 'playing',
      pos: { chapter: 1, step: 0, beat: 0 },
      stepKey: stepKey + 1,
    })
    expect(t.voice.play).toHaveBeenLastCalledWith('decision-1-screen-1')
    expect(t.lastCall().actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)
  })

  test('play() while driving resumes the same way', async () => {
    const t = setup()
    t.state().open(1, true)
    await finishBeat(t)
    t.state().takeOver()
    t.state().play()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(t.demo.loadScenario).toHaveBeenCalledTimes(2)
  })

  test('takeOver() while paused also hands over, so Play restarts the step', () => {
    const t = setup()
    t.state().open(1, false)
    t.state().takeOver()
    expect(t.state().status).toBe('driving')
    t.state().play()
    expect(t.demo.loadScenario).toHaveBeenCalledTimes(2)
    expect(t.state().status).toBe('playing')
  })

  test('resume() while paused carries on like play(), without restarting the step', async () => {
    const t = setup()
    t.state().open(1, true)
    await finishBeat(t)
    t.state().pause()
    t.state().resume()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 1 } })
    expect(t.voice.resume).toHaveBeenCalledTimes(1)
    expect(t.demo.loadScenario).toHaveBeenCalledTimes(1)
  })

  test('takeOver(), resume() and pause() while closed do nothing', () => {
    const t = setup()
    t.state().takeOver()
    t.state().resume()
    t.state().pause()
    expect(t.state().status).toBe('idle')
    expect(t.voice.pause).not.toHaveBeenCalled()
    expect(t.navigate).not.toHaveBeenCalled()
  })
})

describe('next, prev and jump', () => {
  test('rapid next() while playing ends three steps on; earlier runs are aborted and write nothing (Review focus 2)', async () => {
    const t = setup(TOUR)
    t.state().open(0, true)
    t.state().next()
    t.state().next()
    t.state().next()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 2, step: 0, beat: 0 } })
    expect(t.calls).toHaveLength(4)
    expect(t.calls.slice(0, 3).map((call) => call.signal.aborted)).toEqual([true, true, true])
    expect(t.calls[3]!.signal.aborted).toBe(false)
    expect(t.calls[3]!.actions).toEqual([{ kind: 'outline', target: 'story-cards' }])
    expect(t.voice.play).toHaveBeenLastCalledWith('your-turn-1')

    // The abandoned runs try to write and then finish, as an aborted runner would.
    const settled = t.state()
    for (const call of t.calls.slice(0, 3)) {
      call.host.setOutline('stale')
      call.host.setCard({ id: 'stale', side: 'left' })
      void call.host.moveCursor(5, 5, true)
      void call.host.reveal(document.body)
      call.done(['outline:stale'])
    }
    await flush()
    expect(t.state()).toBe(settled)
    expect(t.reveal).not.toHaveBeenCalled()
    expect(t.calls).toHaveLength(4)
  })

  test('next() from paused enters the next step and stays paused', () => {
    const t = setup()
    t.state().open(0, false)
    t.state().next()
    expect(t.state()).toMatchObject({
      status: 'paused',
      pos: { chapter: 0, step: 1, beat: 0 },
      stepKey: 2,
    })
    expect(t.demo.loadScenario).toHaveBeenCalledWith('med-rec-paused')
    expect(t.voice.play).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()
  })

  test('next() while driving enters the next step paused', () => {
    const t = setup()
    t.state().open(0, true)
    t.state().takeOver()
    t.state().next()
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 0, step: 1, beat: 0 } })
    expect(t.run).toHaveBeenCalledTimes(1)
  })

  test('next() on the last step and prev() on the first do nothing', () => {
    const t = setup()
    t.state().open(1, false)
    t.state().next()
    expect(t.state()).toMatchObject({ pos: { chapter: 1, step: 0, beat: 0 }, stepKey: 1 })
    t.state().open(0, false)
    t.state().prev()
    expect(t.state()).toMatchObject({ pos: { chapter: 0, step: 0, beat: 0 }, stepKey: 2 })
  })

  test('prev() goes back to the previous step’s first beat, across chapters', async () => {
    const t = setup()
    t.state().open(1, true)
    await finishBeat(t)
    t.state().prev()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 0, step: 1, beat: 0 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('why-screen-1')
  })

  test('jump(1) enters chapter 1 at its first beat', () => {
    const t = setup()
    t.state().open(0, false)
    t.state().jump(1)
    expect(t.state()).toMatchObject({
      status: 'paused',
      pos: { chapter: 1, step: 0, beat: 0 },
      stepKey: 2,
    })
    expect(t.log.slice(-3)).toEqual(['load:baseline', 'persona:priya', 'navigate:/operations'])
  })

  test('jump() mid-beat while playing aborts the beat and plays the chapter', () => {
    const t = setup()
    t.state().open(0, true)
    t.state().jump(1)
    expect(t.calls[0]!.signal.aborted).toBe(true)
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('decision-1-screen-1')
  })

  test('jump() to a chapter that does not exist, and next() while closed, do nothing', () => {
    const t = setup()
    t.state().next()
    t.state().jump(1)
    expect(t.state().status).toBe('idle')
    t.state().open(0, false)
    t.state().jump(7)
    expect(t.state()).toMatchObject({ pos: { chapter: 0, step: 0, beat: 0 }, stepKey: 1 })
  })
})

describe('settings and exit', () => {
  test('setRate(1.5) sets the voice’s rate and the rate the actions see', () => {
    const t = setup()
    t.state().open(1, true)
    t.state().setRate(1.5)
    expect(t.voice.setRate).toHaveBeenCalledWith(1.5)
    expect(t.state().rate).toBe(1.5)
    expect(t.calls[0]!.host.rate()).toBe(1.5)
  })

  test('toggleCaptions() flips captions', () => {
    const t = setup()
    t.state().toggleCaptions()
    expect(t.state().captions).toBe(false)
    t.state().toggleCaptions()
    expect(t.state().captions).toBe(true)
  })

  test('the host reads the outline and forwards reveal and reduced motion', async () => {
    const t = setup()
    t.state().open(1, true)
    const { host } = t.calls[0]!
    host.setOutline('agent-summary')
    expect(host.outline()).toBe('agent-summary')
    expect(host.reducedMotion()).toBe(true)
    await host.reveal(document.body)
    expect(t.reveal).toHaveBeenCalledWith(document.body)
  })

  test('exit() resets the demo, silences the voice and closes, staying on a product route (R5)', () => {
    const t = setup()
    t.state().open(1, true)
    t.calls[0]!.host.setOutline('agent-summary')
    t.voice.stop.mockClear()
    t.state().exit()
    expect(t.demo.reset).toHaveBeenCalledTimes(1)
    expect(t.voice.stop).toHaveBeenCalled()
    expect(t.calls[0]!.signal.aborted).toBe(true)
    expect(t.state()).toMatchObject({ status: 'idle', outline: null, card: null })
    expect(t.state().cursor.visible).toBe(false)
    expect(t.navigate).not.toHaveBeenCalledWith('/')
  })

  test('exit() on an interlude goes to the landing page (R5)', () => {
    const t = setup()
    t.state().open(0, false)
    t.state().exit()
    expect(t.state().status).toBe('idle')
    expect(t.navigate).toHaveBeenLastCalledWith('/')
  })

  test('exit() while closed does nothing', () => {
    const t = setup()
    t.state().exit()
    expect(t.demo.reset).not.toHaveBeenCalled()
    expect(t.voice.stop).not.toHaveBeenCalled()
  })
})
