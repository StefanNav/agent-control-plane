import { atRoute, markScreen, prefersReducedMotion, revealClear, settleScreen } from './screen'

/** Track a promise so a test can tell whether it has settled yet. */
function track(promise: Promise<void>) {
  const state = { done: false }
  void promise.then(() => {
    state.done = true
  })
  return state
}

/** Let settled promises run their callbacks. */
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

function box(top: number, bottom: number, left = 0, right = 1440): DOMRect {
  return { top, bottom, left, right, height: bottom - top, width: right - left } as DOMRect
}

function element(rect: DOMRect): HTMLElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => rect
  return el
}

afterEach(() => {
  markScreen(0, '')
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('settleScreen (Ruling 10)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    markScreen(1, '/operations')
  })

  test('resolves a frame after the step’s screen has mounted on the step’s pathname, and not before', async () => {
    const settled = track(
      settleScreen(2, '/operations/agents/med-rec', new AbortController().signal),
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(settled.done).toBe(false)

    // The new screen is up, but the router is still on the old route.
    markScreen(2, '/operations')
    await vi.advanceTimersByTimeAsync(100)
    expect(settled.done).toBe(false)

    markScreen(2, '/operations/agents/med-rec')
    await vi.advanceTimersByTimeAsync(0)
    expect(settled.done).toBe(false)
    await vi.advanceTimersByTimeAsync(16)
    expect(settled.done).toBe(true)
  })

  test('the route arriving before the screen works the same way', async () => {
    const settled = track(settleScreen(2, '/inventory', new AbortController().signal))
    markScreen(1, '/inventory')
    await vi.advanceTimersByTimeAsync(100)
    expect(settled.done).toBe(false)
    markScreen(2, '/inventory')
    await vi.advanceTimersByTimeAsync(16)
    expect(settled.done).toBe(true)
  })

  test('resolves at once when that screen is already up on that pathname', async () => {
    markScreen(3, '/operations')
    const settled = track(settleScreen(3, '/operations', new AbortController().signal))
    await flush()
    expect(settled.done).toBe(true)
  })

  test('resolves, never rejects, when aborted, also when aborted already', async () => {
    const controller = new AbortController()
    const settled = track(settleScreen(5, '/nowhere', controller.signal))
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await flush()
    expect(settled.done).toBe(true)

    const late = track(settleScreen(6, '/nowhere', controller.signal))
    await flush()
    expect(late.done).toBe(true)
  })

  test('gives up waiting after 1500 ms, whatever happens', async () => {
    const settled = track(settleScreen(5, '/nowhere', new AbortController().signal))
    await vi.advanceTimersByTimeAsync(1499)
    expect(settled.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled.done).toBe(true)
  })

  test('with the pathname right but the route’s ?tab= not yet, it waits; once the query lands it settles (Ruling 15)', async () => {
    markScreen(2, '/operations/agents/med-rec?tab=overview')
    const settled = track(
      settleScreen(2, '/operations/agents/med-rec?tab=scorecard', new AbortController().signal),
    )
    await vi.advanceTimersByTimeAsync(100)
    expect(settled.done).toBe(false)
    // `?tour=` (or any other extra param) alongside is fine.
    markScreen(2, '/operations/agents/med-rec?tab=scorecard&tour=decisions')
    await vi.advanceTimersByTimeAsync(16)
    expect(settled.done).toBe(true)
  })

  test('a query that never lands still gives way at 1500 ms', async () => {
    markScreen(2, '/operations/agents/med-rec?tab=overview')
    const settled = track(
      settleScreen(2, '/operations/agents/med-rec?tab=scorecard', new AbortController().signal),
    )
    await vi.advanceTimersByTimeAsync(1499)
    expect(settled.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(settled.done).toBe(true)
  })

  test('a settle that has finished stops listening', async () => {
    const settled = track(settleScreen(2, '/a', new AbortController().signal))
    await vi.advanceTimersByTimeAsync(1500)
    expect(settled.done).toBe(true)
    expect(() => markScreen(2, '/a')).not.toThrow()
  })
})

describe('atRoute (Ruling 15)', () => {
  test('the pathname must match', () => {
    expect(atRoute('/operations', '/operations')).toBe(true)
    expect(atRoute('/operations/inbox', '/operations')).toBe(false)
  })

  test('every query param the route sets must be there with its value; extra ones are fine', () => {
    const route = '/operations/agents/med-rec?tab=scorecard'
    expect(atRoute('/operations/agents/med-rec', route)).toBe(false)
    expect(atRoute('/operations/agents/med-rec?tab=overview', route)).toBe(false)
    expect(atRoute('/operations/agents/med-rec?tab=scorecard', route)).toBe(true)
    expect(atRoute('/operations/agents/med-rec?tour=decisions&tab=scorecard', route)).toBe(true)
  })

  test('a hash on the route does not count', () => {
    expect(atRoute('/operations', '/operations#top')).toBe(true)
  })
})

describe('prefersReducedMotion', () => {
  test('reads the media query', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    expect(prefersReducedMotion()).toBe(true)
  })

  test('is false when the browser cannot say', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('revealClear (Ruling 7)', () => {
  const bar = element(box(680, 768))
  let scrollBy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
    // A page taller than the window, scrolled to the top.
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 3000,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'scrollHeight')
  })

  test('leaves a target that already shows above the bar, and resolves at once', async () => {
    const shown = track(revealClear(element(box(100, 200)), bar, false))
    await flush()
    expect(shown.done).toBe(true)
    expect(scrollBy).not.toHaveBeenCalled()
  })

  test('scrolls a target under the bar up clear of it, smoothly, and resolves when the scroll ends', async () => {
    const shown = track(revealClear(element(box(650, 700)), bar, false))
    // The bar's top (680) less the 16 px margin is the floor: 700 − 664.
    expect(scrollBy).toHaveBeenCalledWith({ top: 36, behavior: 'smooth' })
    await vi.advanceTimersByTimeAsync(100)
    expect(shown.done).toBe(false)
    document.dispatchEvent(new Event('scrollend'))
    await flush()
    expect(shown.done).toBe(true)
  })

  test('without scrollend, resolves once the scroll events stop', async () => {
    const shown = track(revealClear(element(box(650, 700)), bar, false))
    await vi.advanceTimersByTimeAsync(100)
    document.dispatchEvent(new Event('scroll'))
    await vi.advanceTimersByTimeAsync(149)
    expect(shown.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(shown.done).toBe(true)
  })

  test('a smooth scroll that never reports back resolves after a second', async () => {
    const shown = track(revealClear(element(box(650, 700)), bar, false))
    await vi.advanceTimersByTimeAsync(999)
    expect(shown.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(shown.done).toBe(true)
  })

  test('under reduced motion it jumps and resolves at once', async () => {
    const shown = track(revealClear(element(box(650, 700)), bar, true))
    expect(scrollBy).toHaveBeenCalledWith({ top: 36, behavior: 'auto' })
    await flush()
    expect(shown.done).toBe(true)
  })

  test('resolves at once when the page cannot scroll any further', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: window.innerHeight,
    })
    const shown = track(revealClear(element(box(650, 700)), bar, false))
    await flush()
    expect(shown.done).toBe(true)
    expect(scrollBy).not.toHaveBeenCalled()
  })

  test('with no bar it keeps the target inside the window', async () => {
    void revealClear(element(box(760, 800)), null, true)
    // The window's bottom (768) less the margin: 800 − 752.
    expect(scrollBy).toHaveBeenCalledWith({ top: 48, behavior: 'auto' })
  })
})
