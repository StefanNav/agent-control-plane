import { act, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { AttuneWelcome } from './AttuneWelcome'
import { restPose, transformOf } from './geometry'
import { forgetWelcomed } from './session'

/** Frames asked for and not yet run or cancelled, by id. */
let frames = new Map<number, FrameRequestCallback>()
let lastId = 0
let requested = 0

/** A reduced-motion preference the test can flip. */
let reduced = false
let listeners = new Set<() => void>()

beforeEach(() => {
  frames = new Map()
  requested = 0
  reduced = false
  listeners = new Set()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    requested++
    frames.set(++lastId, callback)
    return lastId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query === '(prefers-reduced-motion: reduce)' && reduced
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  forgetWelcomed()
})

/** Run the frames asked for so far, as the browser would at `at` ms. */
function frameAt(at: number) {
  const due = [...frames.values()]
  frames.clear()
  act(() => {
    for (const callback of due) callback(at)
  })
}

/** Frames every 16 ms from `from` to `to`, as a 60 Hz screen draws them. */
function framesUntil(to: number, from = 0) {
  for (let at = from; at <= to; at += 16) frameAt(at)
}

function show(props: { hold?: boolean } = {}, wrap = false) {
  const element = <AttuneWelcome {...props} />
  const view = render(wrap ? <StrictMode>{element}</StrictMode> : element)
  const svg = () => view.container.querySelector('svg')!
  const paths = () => [...svg().querySelectorAll('path')]
  const atRest = () => paths().every((path, i) => path.getAttribute('transform') === transformOf(restPose(i)))
  return { ...view, svg, paths, atRest }
}

test('dances on the first visit, then rests and stops asking for frames', () => {
  const view = show()
  expect(view.svg()).toHaveAttribute('data-state', 'dancing')
  framesUntil(2800)
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(frames.size).toBe(0)
  expect(view.atRest()).toBe(true)
})

test('mid-dance the pebbles move', () => {
  const view = show()
  framesUntil(1100)
  expect(view.svg()).toHaveAttribute('data-state', 'dancing')
  expect(view.atRest()).toBe(false)
})

test('plays once a session', () => {
  const first = show()
  framesUntil(2800)
  first.unmount()
  requested = 0
  const again = show()
  expect(again.svg()).toHaveAttribute('data-state', 'still')
  expect(requested).toBe(0)
  expect(again.atRest()).toBe(true)
})

test('under StrictMode the first visit still dances', () => {
  const view = show({}, true)
  expect(view.svg()).toHaveAttribute('data-state', 'dancing')
  framesUntil(1100)
  expect(view.atRest()).toBe(false)
  framesUntil(2800, 1116)
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(frames.size).toBe(0)
})

test('reduced motion keeps it still and asks for no frame', () => {
  reduced = true
  const view = show()
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(requested).toBe(0)
})

test('hold keeps it still and asks for no frame', () => {
  const view = show({ hold: true })
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(requested).toBe(0)
})

test('hold mid-dance jumps to rest and stays there', () => {
  const view = show()
  framesUntil(1000)
  expect(view.atRest()).toBe(false)
  view.rerender(<AttuneWelcome hold />)
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(view.atRest()).toBe(true)
  expect(frames.size).toBe(0)
  view.rerender(<AttuneWelcome />)
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(frames.size).toBe(0)
})

test('reduced motion turning on mid-dance jumps to rest', () => {
  const view = show()
  framesUntil(1000)
  reduced = true
  act(() => listeners.forEach((fn) => fn()))
  expect(view.svg()).toHaveAttribute('data-state', 'still')
  expect(view.atRest()).toBe(true)
  expect(frames.size).toBe(0)
})

test('a held visit uses up the welcome: the page seen again later in the session is still', () => {
  show({ hold: true }).unmount()
  requested = 0
  const again = show()
  expect(again.svg()).toHaveAttribute('data-state', 'still')
  expect(requested).toBe(0)
})

test('leaving mid-dance cancels the frame', () => {
  const view = show()
  framesUntil(1000)
  view.unmount()
  expect(frames.size).toBe(0)
})

test('a long gap never skips the dance', () => {
  const view = show()
  frameAt(0)
  frameAt(16)
  frameAt(5016)
  expect(view.svg()).toHaveAttribute('data-state', 'dancing')
})

test('without matchMedia it still dances', () => {
  vi.stubGlobal('matchMedia', undefined)
  const view = show()
  expect(view.svg()).toHaveAttribute('data-state', 'dancing')
})

test('decorative, with a 140 px footprint by default', () => {
  const svg = show().svg()
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('focusable', 'false')
  expect(svg).toHaveAttribute('data-attune', 'welcome')
  expect(svg).toHaveAttribute('viewBox', '-100 -100 200 200')
  expect(svg).toHaveAttribute('width', '140')
  expect(svg).toHaveAttribute('height', '140')
  expect(svg.querySelectorAll('path')).toHaveLength(4)
})
