/** What speaks a beat's sentence: a real clip, or a timer standing in for one (R3). */
export interface Voice {
  /** Resolves when the clip has finished, or when `stop()` or another `play()` cuts it short. Never rejects. */
  play(beatId: string): Promise<void>
  pause(): void
  resume(): void
  /** Ends the clip now and resolves its `play()`. */
  stop(): void
  setRate(rate: number): void
  /** How far into the current clip it is, in clip milliseconds; 0 when idle. */
  currentMs(): number
  /** Start fetching a beat's clip so it is ready when its turn comes. */
  preload(beatId: string): void
}

/** A playhead that advances with the wall clock, for voices with no audio behind them. */
interface TimerRun {
  pause(): void
  resume(): void
  /** Clip milliseconds per wall-clock millisecond. */
  setSpeed(speed: number): void
  positionMs(): number
  cancel(): void
}

/** Count `totalMs` of clip from `fromMs` at `speed`, calling `done` at the end; pause and resume keep the remainder. */
function startTimer(totalMs: number, fromMs: number, speed: number, done: () => void): TimerRun {
  let position = Math.min(fromMs, totalMs)
  let mark = performance.now()
  let running = true
  let handle: ReturnType<typeof setTimeout> | undefined
  const arm = () => {
    clearTimeout(handle)
    handle = setTimeout(done, Math.max(0, (totalMs - position) / speed))
  }
  const here = () =>
    running ? Math.min(totalMs, position + (performance.now() - mark) * speed) : position
  /** Fold the time since the last mark into the position. */
  const bank = () => {
    position = here()
    mark = performance.now()
  }
  arm()
  return {
    pause() {
      if (!running) return
      bank()
      running = false
      clearTimeout(handle)
    },
    resume() {
      if (running) return
      running = true
      mark = performance.now()
      arm()
    },
    setSpeed(next) {
      bank()
      speed = next
      if (running) arm()
    },
    positionMs: here,
    cancel() {
      running = false
      clearTimeout(handle)
    },
  }
}

/** A voice made of timers: each clip lasts its manifest length ÷ `factor`, so tests and `?tourVoice=silent` run fast. */
export function createSilentVoice(msFor: (beatId: string) => number, factor = 10): Voice {
  let rate = 1
  let current: { timer: TimerRun; resolve: () => void } | null = null
  const end = () => {
    const run = current
    if (!run) return
    current = null
    run.timer.cancel()
    run.resolve()
  }
  return {
    play(beatId) {
      end()
      return new Promise<void>((resolve) => {
        const run = { timer: startTimer(msFor(beatId), 0, factor * rate, () => end()), resolve }
        current = run
      })
    },
    pause: () => current?.timer.pause(),
    resume: () => current?.timer.resume(),
    stop: end,
    setRate(next) {
      rate = next
      current?.timer.setSpeed(factor * rate)
    },
    currentMs: () => current?.timer.positionMs() ?? 0,
    preload: () => {},
  }
}

/** One clip being played: its promise, and the timer that takes over when the audio cannot play. */
interface Playing {
  totalMs: number
  paused: boolean
  /** Counts `play()` calls on the element, so the outcome of a superseded one is ignored. */
  attempt: number
  timer: TimerRun | null
  resolve: () => void
  detach: () => void
}

/**
 * A voice backed by real clips. A clip that errors, or that the browser will not play, still ends
 * after its manifest length ÷ rate, so the tour never stalls on a missing file or blocked audio.
 */
export function createAudioVoice(
  msFor: (beatId: string) => number,
  url: (beatId: string) => string,
): Voice {
  const audio = new Audio()
  audio.preservesPitch = true
  const warm = new Audio()
  warm.preload = 'auto'
  let rate = 1
  let current: Playing | null = null
  let warmed: string | null = null

  const end = (run: Playing) => {
    if (current !== run) return
    current = null
    run.timer?.cancel()
    run.detach()
    run.resolve()
  }

  /** Stand in for the audio with a timer from where it got to. */
  const fallBack = (run: Playing) => {
    if (current !== run || run.timer) return
    run.timer = startTimer(run.totalMs, audio.currentTime * 1000, rate, () => end(run))
    if (run.paused) run.timer.pause()
  }

  const start = (run: Playing) => {
    const attempt = ++run.attempt
    // A `pause()` makes a pending `play()` reject with an AbortError; only a still-wanted attempt counts as a failure.
    const failed = () => {
      if (current === run && run.attempt === attempt && !run.paused) fallBack(run)
    }
    try {
      Promise.resolve(audio.play()).catch(failed)
    } catch {
      failed()
    }
  }

  return {
    play(beatId) {
      if (current) end(current)
      return new Promise<void>((resolve) => {
        const run: Playing = {
          totalMs: msFor(beatId),
          paused: false,
          attempt: 0,
          timer: null,
          resolve,
          detach: () => {
            audio.removeEventListener('ended', onEnded)
            audio.removeEventListener('error', onError)
          },
        }
        const onEnded = () => end(run)
        const onError = () => fallBack(run)
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('error', onError)
        current = run
        audio.src = url(beatId)
        // Loading a new source resets the rate to the default one.
        audio.defaultPlaybackRate = rate
        audio.playbackRate = rate
        start(run)
      })
    },
    pause() {
      if (!current) return
      current.paused = true
      audio.pause()
      current.timer?.pause()
    },
    resume() {
      if (!current?.paused) return
      current.paused = false
      if (current.timer) current.timer.resume()
      else start(current)
    },
    stop() {
      audio.pause()
      if (current) end(current)
    },
    setRate(next) {
      rate = next
      audio.defaultPlaybackRate = next
      audio.playbackRate = next
      current?.timer?.setSpeed(next)
    },
    currentMs() {
      if (!current) return 0
      return current.timer ? current.timer.positionMs() : audio.currentTime * 1000
    },
    preload(beatId) {
      if (warmed === beatId) return
      warmed = beatId
      warm.src = url(beatId)
    },
  }
}
