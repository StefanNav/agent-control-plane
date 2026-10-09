import { createAudioVoice, createSilentVoice } from './voice'

const CLIPS: Record<string, number> = { a: 4000, b: 2000 }
const msFor = (id: string) => CLIPS[id] ?? 1000
const url = (id: string) => `/clips/${id}.m4a`

/** Track a promise so a test can tell whether it has settled yet. */
function track(promise: Promise<void>) {
  const state = { done: false }
  void promise.then(() => {
    state.done = true
  })
  return state
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createSilentVoice', () => {
  test('resolves after the clip length ÷ 10', async () => {
    const voice = createSilentVoice(msFor)
    const played = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(399)
    expect(played.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(played.done).toBe(true)
  })

  test('takes the factor from the second argument', async () => {
    const voice = createSilentVoice(msFor, 4)
    const played = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(999)
    expect(played.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(played.done).toBe(true)
  })

  test('pause holds the clip and resume finishes the remainder', async () => {
    const voice = createSilentVoice(msFor)
    const played = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(100)
    voice.pause()
    await vi.advanceTimersByTimeAsync(5000)
    expect(played.done).toBe(false)
    voice.resume()
    await vi.advanceTimersByTimeAsync(299)
    expect(played.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(played.done).toBe(true)
  })

  test('the playback rate shortens the clip, also mid-play', async () => {
    const voice = createSilentVoice(msFor)
    voice.setRate(2)
    const first = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(199)
    expect(first.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(first.done).toBe(true)

    voice.setRate(1)
    const second = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(100)
    voice.setRate(1.5)
    // 1000 of 4000 clip ms are played; the other 3000 take 3000 ÷ 15 = 200 ms.
    await vi.advanceTimersByTimeAsync(199)
    expect(second.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(second.done).toBe(true)
  })

  test('currentMs is how far into the clip it is, and 0 when idle', async () => {
    const voice = createSilentVoice(msFor)
    expect(voice.currentMs()).toBe(0)
    void voice.play('a')
    await vi.advanceTimersByTimeAsync(100)
    expect(voice.currentMs()).toBe(1000)
    voice.pause()
    await vi.advanceTimersByTimeAsync(500)
    expect(voice.currentMs()).toBe(1000)
    voice.stop()
    expect(voice.currentMs()).toBe(0)
  })

  test('stop resolves a pending play, and playing again resolves the one before', async () => {
    const voice = createSilentVoice(msFor)
    const first = track(voice.play('a'))
    voice.stop()
    await vi.advanceTimersByTimeAsync(0)
    expect(first.done).toBe(true)

    const second = track(voice.play('a'))
    const third = track(voice.play('b'))
    await vi.advanceTimersByTimeAsync(0)
    expect(second.done).toBe(true)
    expect(third.done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(third.done).toBe(true)
  })

  test('pause, resume, stop and preload with nothing playing do nothing', () => {
    const voice = createSilentVoice(msFor)
    expect(() => {
      voice.pause()
      voice.resume()
      voice.stop()
      voice.preload('a')
    }).not.toThrow()
  })
})

describe('createAudioVoice', () => {
  let created: HTMLAudioElement[]
  let played: HTMLMediaElement[]
  let playResult: () => Promise<void>

  /** The element that plays clips; `new Audio()` is stubbed to hand out real `<audio>` elements and keep them. */
  const main = () => created[0]!

  beforeEach(() => {
    created = []
    played = []
    playResult = () => Promise.resolve()
    vi.stubGlobal('Audio', function Audio() {
      const el = document.createElement('audio')
      created.push(el)
      return el
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      played.push(this)
      return playResult()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('plays the clip on one element with pitch preserved', () => {
    const voice = createAudioVoice(msFor, url)
    void voice.play('a')
    expect(played).toEqual([main()])
    expect(main().getAttribute('src')).toBe('/clips/a.m4a')
    expect(main().preservesPitch).toBe(true)
  })

  test('applies the playback rate to the clip it plays', () => {
    const voice = createAudioVoice(msFor, url)
    voice.setRate(1.25)
    void voice.play('a')
    expect(main().playbackRate).toBe(1.25)
    voice.setRate(1.5)
    expect(main().playbackRate).toBe(1.5)
  })

  test('resolves on the ended event, however long the manifest says it is', async () => {
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(result.done).toBe(false)
    main().dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(0)
    expect(result.done).toBe(true)
  })

  test('resolves msFor ÷ rate after an error event', async () => {
    const voice = createAudioVoice(msFor, url)
    voice.setRate(2)
    const result = track(voice.play('a'))
    main().dispatchEvent(new Event('error'))
    await vi.advanceTimersByTimeAsync(1999)
    expect(result.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(result.done).toBe(true)
  })

  test('resolves msFor ÷ rate when the browser refuses to play', async () => {
    playResult = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('b'))
    await vi.advanceTimersByTimeAsync(1999)
    expect(result.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(result.done).toBe(true)
  })

  test('a pause or resume on a blocked clip still ends the beat on time', async () => {
    playResult = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('b'))
    await vi.advanceTimersByTimeAsync(500)
    voice.pause()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(result.done).toBe(false)
    voice.resume()
    await vi.advanceTimersByTimeAsync(1499)
    expect(result.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(result.done).toBe(true)
  })

  test('pause pauses the audio, and the abort it causes does not end the beat early', async () => {
    let reject: (reason: unknown) => void = () => {}
    playResult = () =>
      new Promise<void>((_, rej) => {
        reject = rej
      })
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('b'))
    voice.pause()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
    // A real browser rejects the pending play() with an AbortError when pause() interrupts it.
    reject(new DOMException('interrupted', 'AbortError'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(result.done).toBe(false)

    playResult = () => Promise.resolve()
    voice.resume()
    expect(played).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(result.done).toBe(false)
    main().dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(0)
    expect(result.done).toBe(true)
  })

  test('an abort from a pause that was already resumed does not end the beat early', async () => {
    const rejects: ((reason: unknown) => void)[] = []
    playResult = () =>
      new Promise<void>((_, rej) => {
        rejects.push(rej)
      })
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('b'))
    voice.pause()
    voice.resume()
    rejects[0]!(new DOMException('interrupted', 'AbortError'))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(result.done).toBe(false)
  })

  test('stop pauses the audio and resolves a pending play', async () => {
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('a'))
    voice.stop()
    await vi.advanceTimersByTimeAsync(0)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(result.done).toBe(true)
  })

  test('stop also ends a clip that has fallen back to the timer', async () => {
    playResult = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    const voice = createAudioVoice(msFor, url)
    const result = track(voice.play('a'))
    await vi.advanceTimersByTimeAsync(0)
    voice.stop()
    await vi.advanceTimersByTimeAsync(0)
    expect(result.done).toBe(true)
  })

  test('a clip that ended does not resolve the next one', async () => {
    const voice = createAudioVoice(msFor, url)
    const first = track(voice.play('a'))
    main().dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(0)
    expect(first.done).toBe(true)

    const second = track(voice.play('b'))
    main().dispatchEvent(new Event('error'))
    main().dispatchEvent(new Event('error'))
    await vi.advanceTimersByTimeAsync(1999)
    expect(second.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(second.done).toBe(true)
  })

  test('currentMs reads the audio position, and the timer once it has fallen back', async () => {
    const voice = createAudioVoice(msFor, url)
    expect(voice.currentMs()).toBe(0)
    void voice.play('a')
    main().currentTime = 1.5
    expect(voice.currentMs()).toBe(1500)
    main().dispatchEvent(new Event('error'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(voice.currentMs()).toBe(2500)
    voice.stop()
    expect(voice.currentMs()).toBe(0)
  })

  test('preload warms the second element and leaves the playing one alone', () => {
    const voice = createAudioVoice(msFor, url)
    void voice.play('a')
    voice.preload('b')
    expect(created).toHaveLength(2)
    expect(created[1]!.getAttribute('src')).toBe('/clips/b.m4a')
    expect(created[1]!.preload).toBe('auto')
    expect(main().getAttribute('src')).toBe('/clips/a.m4a')
    expect(played).toEqual([main()])
  })
})
