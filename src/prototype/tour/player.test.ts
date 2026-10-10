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
    id: 'close',
    title: 'Your turn',
    steps: [
      {
        id: 'close-end',
        route: '/tour/end',
        beats: [
          {
            id: 'close-1',
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
    unlock: vi.fn<Voice['unlock']>(),
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

interface SettleCall {
  stepKey: number
  signal: AbortSignal
  resolve(): void
  reject(error: Error): void
}

/** The entered step's screen settling: at once, or (manual) only when the test says so. */
function makeSettle(manual: boolean) {
  const settles: SettleCall[] = []
  const settle = vi.fn<PlayerDeps['settle']>(
    (stepKey, signal) =>
      new Promise<void>((resolve, reject) => {
        settles.push({ stepKey, signal, resolve, reject })
        if (!manual) resolve()
      }),
  )
  return { settle, settles }
}

function setup(
  chapters: Chapter[] = FIXTURE_CHAPTERS,
  { reducedMotion = true, manualSettle = false } = {},
) {
  const log: string[] = []
  const { voice, finish } = makeVoice()
  const { run, calls } = makeRun()
  const { settle, settles } = makeSettle(manualSettle)
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
  const watchClick = vi.fn(async () => {})
  const deps: PlayerDeps = {
    chapters,
    timeline: buildTimeline(chapters, {}),
    voice,
    demo,
    navigate,
    exitStory,
    run,
    reveal,
    watchClick,
    reducedMotion: () => reducedMotion,
    settle,
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
    watchClick,
    settle,
    settles,
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
    clicks: 0,
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
    expect(t.navigate).toHaveBeenCalledWith('/tour/problem')
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

  test('open(chapter, true) plays from the chapter’s first beat', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    expect(t.state().status).toBe('playing')
    expect(t.voice.play).toHaveBeenCalledWith('decisions-screen-1')
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
    await flush()
    expect(t.state().status).toBe('playing')
    expect(t.voice.play).toHaveBeenCalledTimes(1)
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-1')
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.calls[0]!.actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)

    t.finish()
    await flush()
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 0 })

    t.calls[0]!.done()
    await flush()
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 1 })
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-2')
    expect(t.lastCall().actions).toEqual([{ kind: 'clearCard' }])
  })

  test('actions finishing first do not end the beat either', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    t.calls[0]!.done()
    await flush()
    expect(t.state().pos.beat).toBe(0)
    t.finish()
    await flush()
    expect(t.state().pos.beat).toBe(1)
  })

  test('a beat with no actions still goes through the runner, with none', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
    expect(t.calls[0]!.actions).toEqual([])
  })

  test('each beat preloads the next one’s clip, across steps; the last beat preloads nothing', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
    expect(t.voice.preload).toHaveBeenLastCalledWith('problem-intro-2')
    await finishBeat(t)
    await finishBeat(t)
    expect(t.voice.preload).toHaveBeenLastCalledWith('problem-screen-1')
    t.state().jump(1)
    await flush()
    expect(t.voice.preload).toHaveBeenLastCalledWith('decisions-screen-2')
    t.voice.preload.mockClear()
    await finishBeat(t)
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 1 })
    expect(t.voice.preload).not.toHaveBeenCalled()
  })

  test('crossing a step boundary enters the new step', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
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
    expect(t.voice.play).toHaveBeenLastCalledWith('problem-screen-1')

    await finishBeat(t)
    await finishBeat(t)
    expect(t.state()).toMatchObject({ pos: { chapter: 1, step: 0, beat: 0 }, stepKey: 3 })
    expect(t.demo.loadScenario).toHaveBeenCalledTimes(2)
    expect(t.demo.loadScenario).toHaveBeenLastCalledWith('baseline')
  })

  test('finishing the last beat closes the tour and stays on a product route (R5)', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
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
    await flush()
    await finishBeat(t)
    expect(t.demo.reset).toHaveBeenCalledTimes(1)
    expect(t.state().status).toBe('idle')
    expect(t.navigate).toHaveBeenLastCalledWith('/')
  })

  test('play() twice runs one beat', async () => {
    const t = setup()
    t.state().open(1, false)
    t.state().play()
    t.state().play()
    await flush()
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
    await flush()
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
    await flush()
    t.lastCall().done(['outline:a'])
    t.finish()
    await flush()
    t.lastCall().done(['click:b'])
    await flush()
    expect(t.state().skipped).toEqual(['outline:a', 'click:b'])

    t.state().open(1, false)
    expect(t.state().skipped).toEqual([])
    t.state().play()
    await flush()
    t.lastCall().done(['outline:a'])
    await flush()
    expect(t.state().skipped).toEqual(['outline:a'])
    t.state().exit()
    expect(t.state().skipped).toEqual([])
  })
})

describe('after-actions (Ruling 17)', () => {
  /** A beat that outlines a row, then clicks through it at the end of its line; then a beat on, and the decisions chapter. */
  const AFTER: Chapter[] = [
    {
      id: 'open',
      title: 'Open on the product',
      steps: [
        {
          id: 'open-product',
          route: '/operations',
          scenario: 'baseline',
          persona: 'marcus',
          beats: [
            {
              id: 'open-1',
              text: 'In Medications, that person is Marcus.',
              actions: [{ kind: 'outline', target: 'board-medications' }],
              after: [
                { kind: 'click', target: 'board-medications' },
                { kind: 'click', target: 'board-open-division' },
              ],
            },
            { id: 'open-2', text: 'This one drafts home medication lists.' },
          ],
        },
      ],
    },
    FIXTURE_CHAPTERS[1]!,
  ]
  const afterActions = AFTER[0]!.steps[0]!.beats[0]!.after

  test('run with the beat’s host and signal once its clip has ended and its actions are done, then the tour moves on', async () => {
    const t = setup(AFTER)
    t.state().open(0, true)
    await flush()
    t.finish()
    await flush()
    expect(t.calls).toHaveLength(1)

    t.calls[0]!.done()
    await flush()
    expect(t.calls).toHaveLength(2)
    expect(t.calls[1]!.actions).toEqual(afterActions)
    expect(t.calls[1]!.host).toBe(t.calls[0]!.host)
    expect(t.calls[1]!.signal).toBe(t.calls[0]!.signal)
    expect(t.state().pos.beat).toBe(0)

    t.calls[1]!.done(['click:board-open-division'])
    await flush()
    expect(t.state().pos.beat).toBe(1)
    expect(t.voice.play).toHaveBeenLastCalledWith('open-2')
    expect(t.state().skipped).toEqual(['click:board-open-division'])
  })

  test('wait for the clip too when the actions finish first', async () => {
    const t = setup(AFTER)
    t.state().open(0, true)
    await flush()
    t.calls[0]!.done()
    await flush()
    expect(t.calls).toHaveLength(1)
    t.finish()
    await flush()
    expect(t.calls).toHaveLength(2)
    expect(t.calls[1]!.actions).toEqual(afterActions)
  })

  test('a beat without them goes straight on', async () => {
    const t = setup(AFTER)
    t.state().open(0, true)
    await flush()
    await finishBeat(t)
    t.lastCall().done()
    await flush()
    expect(t.state().pos.beat).toBe(1)
    const runs = t.calls.length
    await finishBeat(t)
    expect(t.calls).toHaveLength(runs + 1)
    expect(t.lastCall().actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-1')
  })

  test('next() while they run aborts them, and they write nothing', async () => {
    const t = setup(AFTER)
    t.state().open(0, true)
    await flush()
    await finishBeat(t)
    const after = t.calls[1]!
    t.state().next()
    await flush()
    expect(after.signal.aborted).toBe(true)
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 0 } })
    after.host.setOutline('stale')
    after.done(['click:stale'])
    await flush()
    expect(t.state()).toMatchObject({ outline: null, skipped: [] })
    expect(t.state().pos).toEqual({ chapter: 1, step: 0, beat: 0 })
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-1')
  })

  test('pause while they run lets them finish, then waits for play() before moving on (Ruling 8)', async () => {
    const t = setup(AFTER)
    t.state().open(0, true)
    await flush()
    await finishBeat(t)
    t.state().pause()
    expect(t.calls[1]!.signal.aborted).toBe(false)
    t.calls[1]!.done()
    await flush()
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 0, step: 0, beat: 0 } })
    expect(t.voice.play).toHaveBeenCalledTimes(1)

    t.state().play()
    await flush()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 0, step: 0, beat: 1 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('open-2')
  })
})

describe('waiting for the step’s screen (Ruling 10)', () => {
  const beat0 = FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!

  test('a step’s first beat starts only once its screen has settled: voice and actions both wait', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    expect(t.settles).toHaveLength(1)
    expect(t.settles[0]!.stepKey).toBe(1)
    await flush()
    expect(t.voice.play).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()

    t.settles[0]!.resolve()
    await flush()
    expect(t.voice.play).toHaveBeenCalledWith(beat0.id)
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.calls[0]!.actions).toEqual(beat0.actions)
    expect(t.calls[0]!.signal).toBe(t.settles[0]!.signal)
  })

  test('resume() waits for the re-entered step’s screen, under its new stepKey', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    t.settles[0]!.resolve()
    await flush()
    await finishBeat(t)
    t.state().takeOver()
    t.state().resume()
    expect(t.state().stepKey).toBe(2)
    expect(t.settles).toHaveLength(2)
    expect(t.settles[1]!.stepKey).toBe(2)
    await flush()
    expect(t.run).toHaveBeenCalledTimes(2)

    t.settles[1]!.resolve()
    await flush()
    expect(t.run).toHaveBeenCalledTimes(3)
    expect(t.lastCall().actions).toEqual(beat0.actions)
    expect(t.voice.play).toHaveBeenLastCalledWith(beat0.id)
  })

  test('next() while the step is still settling: the old settle starts nothing, only the new step’s first beat runs', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(0, true)
    t.state().next()
    expect(t.settles).toHaveLength(2)
    expect(t.settles[0]!.signal.aborted).toBe(true)

    t.settles[0]!.resolve()
    await flush()
    expect(t.voice.play).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()

    t.settles[1]!.resolve()
    await flush()
    expect(t.voice.play).toHaveBeenCalledTimes(1)
    expect(t.voice.play).toHaveBeenCalledWith('problem-screen-1')
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.calls[0]!.actions).toEqual([{ kind: 'outline', target: 'agent-summary' }])
  })

  test('later beats in a step do not wait again; the next step does', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
    await finishBeat(t)
    await finishBeat(t)
    expect(t.state().pos).toEqual({ chapter: 0, step: 0, beat: 2 })
    expect(t.settle).toHaveBeenCalledTimes(1)
    await finishBeat(t)
    expect(t.state().pos).toEqual({ chapter: 0, step: 1, beat: 0 })
    expect(t.settle).toHaveBeenCalledTimes(2)
    expect(t.settles[1]!.stepKey).toBe(2)
  })

  test('a step entered paused settles but starts nothing; play() then starts its first beat without waiting again', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, false)
    expect(t.settles).toHaveLength(1)
    t.settles[0]!.resolve()
    await flush()
    expect(t.run).not.toHaveBeenCalled()

    t.state().play()
    expect(t.voice.play).toHaveBeenCalledWith(beat0.id)
    expect(t.calls[0]!.signal).toBe(t.settles[0]!.signal)
    expect(t.settles).toHaveLength(1)
  })

  test('play() before the screen settles plays the first beat once it has', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, false)
    t.state().play()
    expect(t.state().status).toBe('playing')
    await flush()
    expect(t.run).not.toHaveBeenCalled()
    t.settles[0]!.resolve()
    await flush()
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.voice.play).toHaveBeenCalledWith(beat0.id)
  })

  test('pausing while the screen settles holds the first beat until play()', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    t.state().pause()
    t.settles[0]!.resolve()
    await flush()
    expect(t.run).not.toHaveBeenCalled()
    t.state().play()
    expect(t.run).toHaveBeenCalledTimes(1)
    expect(t.settles).toHaveLength(1)
  })

  test('taking over or exiting while the screen settles starts nothing', async () => {
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    t.state().takeOver()
    expect(t.settles[0]!.signal.aborted).toBe(true)
    t.settles[0]!.resolve()
    t.state().resume()
    t.state().exit()
    expect(t.settles[1]!.signal.aborted).toBe(true)
    t.settles[1]!.resolve()
    await flush()
    expect(t.run).not.toHaveBeenCalled()
    expect(t.voice.play).not.toHaveBeenCalled()
  })

  test('a settle that fails is warned about and the beat starts anyway', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    t.settles[0]!.reject(new Error('outlet never mounted'))
    await flush()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(t.run).toHaveBeenCalledTimes(1)
  })

  test('a settle that rejects after its step was left is not warned about', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = setup(FIXTURE_CHAPTERS, { manualSettle: true })
    t.state().open(1, true)
    t.state().exit()
    t.settles[0]!.reject(new Error('aborted'))
    await flush()
    expect(warn).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()
  })
})

describe('pause', () => {
  test('pause() holds the voice only; running actions finish and the beat ends after play()', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
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
    await flush()
    t.finish()
    t.state().pause()
    t.calls[0]!.done()
    await flush()
    expect(t.state()).toMatchObject({ status: 'paused', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(t.voice.play).toHaveBeenCalledTimes(1)

    t.state().play()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 1 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-2')
  })

  test('the cursor hides while paused and shows again on play()', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    void t.calls[0]!.host.moveCursor(10, 20, true)
    expect(t.state().cursor).toEqual({ x: 10, y: 20, visible: true, click: true })
    t.state().pause()
    expect(t.state().cursor.visible).toBe(false)
    t.state().play()
    expect(t.state().cursor).toEqual({ x: 10, y: 20, visible: true, click: true })
  })

  test('clicks counts each press of the cursor, and nothing else: not a move, not showing it again', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    const host = t.calls[0]!.host
    void host.moveCursor(10, 20, false)
    expect(t.state().clicks).toBe(0)
    void host.moveCursor(10, 20, true)
    expect(t.state().clicks).toBe(1)
    t.state().pause()
    t.state().play()
    expect(t.state().clicks).toBe(1)
    // The same spot again is still a new click.
    void host.moveCursor(10, 20, true)
    expect(t.state().clicks).toBe(2)
  })

  test('a run that was dropped does not count its clicks', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    const host = t.calls[0]!.host
    t.state().takeOver()
    void host.moveCursor(10, 20, true)
    expect(t.state().clicks).toBe(0)
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
    const t = setup(FIXTURE_CHAPTERS, { reducedMotion: false })
    t.state().open(1, true)
    await flush()
    t.state().setRate(1.5)
    const glided = track(t.calls[0]!.host.moveCursor(1, 2, false))
    await vi.advanceTimersByTimeAsync(399)
    expect(glided.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(glided.done).toBe(true)
  })

  test('under reduced motion the cursor jumps', async () => {
    vi.useFakeTimers()
    const t = setup(FIXTURE_CHAPTERS, { reducedMotion: true })
    t.state().open(1, true)
    await flush()
    const glided = track(t.calls[0]!.host.moveCursor(1, 2, false))
    await flush()
    expect(glided.done).toBe(true)
  })

  test('an aborted run stops waiting for its glide', async () => {
    vi.useFakeTimers()
    const t = setup(FIXTURE_CHAPTERS, { reducedMotion: false })
    t.state().open(1, true)
    await flush()
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
    await flush()
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
    await flush()
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
    await flush()
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-1')
    expect(t.lastCall().actions).toEqual(FIXTURE_CHAPTERS[1]!.steps[0]!.beats[0]!.actions)
  })

  test('play() while driving resumes the same way', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
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
    await flush()
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
  test('rapid next() while playing ends three steps on; earlier work is aborted and writes nothing (Review focus 2)', async () => {
    const t = setup(TOUR)
    t.state().open(0, true)
    await flush()
    const first = t.calls[0]!
    t.state().next()
    t.state().next()
    t.state().next()
    await flush()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 2, step: 0, beat: 0 } })
    expect(first.signal.aborted).toBe(true)
    expect(t.settles.map((settle) => settle.signal.aborted)).toEqual([true, true, true, false])
    // Only the last step's first beat ran; the steps skipped past never started theirs.
    expect(t.calls).toHaveLength(2)
    expect(t.calls[1]!.actions).toEqual([{ kind: 'outline', target: 'story-cards' }])
    expect(t.voice.play).toHaveBeenCalledTimes(2)
    expect(t.voice.play).toHaveBeenLastCalledWith('close-1')

    // The abandoned run tries to write and then finishes, as an aborted runner would.
    const settled = t.state()
    first.host.setOutline('stale')
    first.host.setCard({ id: 'stale', side: 'left' })
    void first.host.moveCursor(5, 5, true)
    void first.host.reveal(document.body)
    void first.host.watchClick()
    first.done(['outline:stale'])
    await flush()
    expect(t.state()).toBe(settled)
    expect(t.reveal).not.toHaveBeenCalled()
    expect(t.watchClick).not.toHaveBeenCalled()
    expect(t.calls).toHaveLength(2)
  })

  test('next() from paused enters the next step and stays paused', async () => {
    const t = setup()
    t.state().open(0, false)
    t.state().next()
    await flush()
    expect(t.state()).toMatchObject({
      status: 'paused',
      pos: { chapter: 0, step: 1, beat: 0 },
      stepKey: 2,
    })
    expect(t.demo.loadScenario).toHaveBeenCalledWith('med-rec-paused')
    expect(t.voice.play).not.toHaveBeenCalled()
    expect(t.run).not.toHaveBeenCalled()
  })

  test('next() while driving enters the next step paused', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
    t.state().takeOver()
    t.state().next()
    await flush()
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
    await flush()
    await finishBeat(t)
    t.state().prev()
    await flush()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 0, step: 1, beat: 0 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('problem-screen-1')
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

  test('jump() mid-beat while playing aborts the beat and plays the chapter', async () => {
    const t = setup()
    t.state().open(0, true)
    await flush()
    t.state().jump(1)
    expect(t.calls[0]!.signal.aborted).toBe(true)
    await flush()
    expect(t.state()).toMatchObject({ status: 'playing', pos: { chapter: 1, step: 0, beat: 0 } })
    expect(t.voice.play).toHaveBeenLastCalledWith('decisions-screen-1')
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
  test('setRate(1.5) sets the voice’s rate and the rate the actions see', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
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

  test('the host reads the outline and forwards reveal, reduced motion and the page answering a click', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
    const { host, signal } = t.calls[0]!
    host.setOutline('agent-summary')
    expect(host.outline()).toBe('agent-summary')
    expect(host.reducedMotion()).toBe(true)
    await host.reveal(document.body)
    expect(t.reveal).toHaveBeenCalledWith(document.body)
    await host.watchClick()
    expect(t.watchClick).toHaveBeenCalledWith(signal)
  })

  test('exit() resets the demo, silences the voice and closes, staying on a product route (R5)', async () => {
    const t = setup()
    t.state().open(1, true)
    await flush()
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
