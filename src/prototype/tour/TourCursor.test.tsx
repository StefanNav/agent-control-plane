import { act, render } from '@testing-library/react'
import { TourCursor, type TourCursorProps } from './TourCursor'

function setup(props: Partial<TourCursorProps> = {}) {
  const base: TourCursorProps = { x: 0, y: 0, visible: false, clicks: 0, rate: 1, ...props }
  const view = render(<TourCursor {...base} />)
  const cursor = () => view.container.querySelector<HTMLElement>('[data-tour="cursor"]')!
  const ring = () => view.container.querySelector<HTMLElement>('[data-tour="ring"]')
  const update = (next: Partial<TourCursorProps>) => {
    Object.assign(base, next)
    view.rerender(<TourCursor {...base} />)
  }
  return { cursor, ring, update }
}

test('an overlay the pointer passes through, hidden from assistive tech', () => {
  const { cursor } = setup()
  expect(cursor()).toHaveAttribute('aria-hidden', 'true')
  expect(cursor()).toHaveAttribute('data-visible', 'false')
})

test('glides to its point over 600 ms ÷ rate', () => {
  const { cursor, update } = setup({ visible: true })
  update({ x: 120, y: 340, rate: 1.5 })
  expect(cursor()).toHaveStyle({ transform: 'translate(120px, 340px)' })
  expect(cursor().style.transitionDuration).toBe('400ms')
  expect(cursor()).toHaveAttribute('data-visible', 'true')
})

test('no ring for clicks made before it mounted', () => {
  const { ring } = setup({ visible: true, clicks: 4 })
  expect(ring()).toBeNull()
})

test('the ring pulses on each new click, waiting out the glide, and not when the cursor shows again', () => {
  const { ring, update } = setup({ visible: true, x: 10, y: 10 })
  update({ x: 50, y: 60, clicks: 1 })
  const first = ring()
  expect(first).not.toBeNull()
  expect(first!.style.animationDelay).toBe('600ms')

  // Paused, then playing again: the same click, so the same ring (its pulse does not replay).
  update({ visible: false })
  update({ visible: true })
  expect(ring()).toBe(first)

  // A second click on the same spot is a new pulse.
  update({ clicks: 2 })
  expect(ring()).not.toBe(first)
  expect(ring()).not.toBeNull()
})

describe('idle (Ruling 18)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('fades out 1500 ms after its last move or click, and shows again on its next move', () => {
    const { cursor, update } = setup({ visible: true, x: 10, y: 10 })
    expect(cursor()).toHaveAttribute('data-idle', 'false')

    // A move restarts the wait.
    act(() => vi.advanceTimersByTime(1000))
    update({ x: 50, y: 60, clicks: 1 })
    act(() => vi.advanceTimersByTime(1499))
    expect(cursor()).toHaveAttribute('data-idle', 'false')
    act(() => vi.advanceTimersByTime(1))
    expect(cursor()).toHaveAttribute('data-idle', 'true')

    // Paused and played again, it stays faded until it moves.
    update({ visible: false })
    update({ visible: true })
    expect(cursor()).toHaveAttribute('data-idle', 'true')

    // A second click on the same spot shows it, and starts the wait again.
    update({ clicks: 2 })
    expect(cursor()).toHaveAttribute('data-idle', 'false')
    act(() => vi.advanceTimersByTime(1500))
    expect(cursor()).toHaveAttribute('data-idle', 'true')

    update({ x: 200, y: 80, clicks: 3 })
    expect(cursor()).toHaveAttribute('data-idle', 'false')
  })
})
