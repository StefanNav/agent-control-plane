import { act, fireEvent, render } from '@testing-library/react'
import { AttuneSplash, SPLASH_FADE_MS, SPLASH_HOLD_MS } from './AttuneSplash'
import { forgetWelcomed, hasWelcomed } from './session'

/** Frames asked for and not yet run or cancelled, by id. */
let frames = new Map<number, FrameRequestCallback>()
let lastId = 0
let reduced = false

beforeEach(() => {
  frames = new Map()
  reduced = false
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++lastId, callback)
    return lastId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && reduced,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  forgetWelcomed()
})

/** Frames every 16 ms up to `to` ms, as a 60 Hz screen draws them. */
function framesUntil(to: number) {
  for (let at = 0; at <= to; at += 16) {
    const due = [...frames.values()]
    frames.clear()
    act(() => {
      for (const callback of due) callback(at)
    })
  }
}

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const splash = () => document.querySelector<HTMLElement>('[data-tour="splash"]')

function show(open = true) {
  const view = render(
    <>
      <button type="button">Play tour</button>
      <AttuneSplash show={open} />
    </>,
  )
  return { ...view, again: (next: boolean) => view.rerender(<AttuneSplash show={next} />) }
}

test('when the tour’s welcome first shows in a fresh session, it covers the page: the mark dancing, and the name', () => {
  show()
  expect(splash()).toHaveAttribute('aria-hidden', 'true')
  expect(splash()?.querySelector('[data-attune="welcome"]')).toHaveAttribute(
    'data-state',
    'dancing',
  )
  expect(splash()).toHaveTextContent('Attune')
  expect(splash()).toHaveTextContent('Agent Control Plane')
  expect(hasWelcomed()).toBe(true)
})

test('waits for the welcome to show', () => {
  const view = show(false)
  expect(splash()).toBeNull()
  view.again(true)
  expect(splash()).not.toBeNull()
})

test('once the mark rests, a beat, then it fades and goes', () => {
  show()
  framesUntil(2800)
  expect(splash()?.querySelector('[data-attune="welcome"]')).toHaveAttribute('data-state', 'still')
  expect(splash()).toHaveAttribute('data-leaving', 'false')
  wait(SPLASH_HOLD_MS)
  expect(splash()).toHaveAttribute('data-leaving', 'true')
  wait(SPLASH_FADE_MS)
  expect(splash()).toBeNull()
})

test('a click skips it', () => {
  show()
  framesUntil(500)
  fireEvent.pointerDown(splash()!)
  expect(splash()).toHaveAttribute('data-leaving', 'true')
  wait(SPLASH_FADE_MS)
  expect(splash()).toBeNull()
})

test('a key skips it and goes no further: it never presses what has focus', () => {
  const view = show()
  const onDocument = vi.fn()
  document.addEventListener('keydown', onDocument, true)
  const play = view.getByRole('button', { name: 'Play tour' })
  const onPlay = vi.fn()
  play.addEventListener('keydown', onPlay)
  const pressed = fireEvent.keyDown(play, { key: 'Enter' })
  expect(pressed).toBe(false)
  expect(onDocument).not.toHaveBeenCalled()
  expect(onPlay).not.toHaveBeenCalled()
  expect(splash()).toHaveAttribute('data-leaving', 'true')
  wait(SPLASH_FADE_MS)
  expect(splash()).toBeNull()
  fireEvent.keyDown(play, { key: 'Enter' })
  expect(onPlay).toHaveBeenCalledTimes(1)
  document.removeEventListener('keydown', onDocument, true)
})

test('every time the welcome shows: a refresh plays it again, in a session already welcomed', () => {
  sessionStorage.setItem('attune-welcomed', '1')
  show()
  expect(splash()).not.toBeNull()
})

test('switched off for tests about the tour itself (attune-splash=off)', () => {
  sessionStorage.setItem('attune-splash', 'off')
  show()
  expect(splash()).toBeNull()
  sessionStorage.removeItem('attune-splash')
})

test('not under reduced motion: the page opens straight away', () => {
  reduced = true
  show()
  expect(splash()).toBeNull()
})

test('the welcome closing takes it away at once', () => {
  const view = show()
  view.again(false)
  expect(splash()).toBeNull()
})
