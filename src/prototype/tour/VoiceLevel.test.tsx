import { act, render } from '@testing-library/react'
import { VoiceLevel, type VoiceLevelProps } from './VoiceLevel'

/** Frames asked for and not yet run or cancelled, by id. */
let frames = new Map<number, FrameRequestCallback>()
let lastId = 0

beforeEach(() => {
  frames = new Map()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++lastId, callback)
    return lastId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Run the frames asked for so far, as the browser would before its next paint. */
function nextFrame() {
  const due = [...frames.values()]
  frames.clear()
  act(() => {
    for (const callback of due) callback(performance.now())
  })
}

/** Ten windows of 50 ms, rising 0 to 9: the level at a playhead is its tens of milliseconds ÷ 5. */
const LEVELS = '0123456789'

function setup(overrides: Partial<VoiceLevelProps> = {}) {
  const voice = { ms: 0 }
  const props: VoiceLevelProps = {
    playing: true,
    levels: LEVELS,
    clipMs: 500,
    currentMs: () => voice.ms,
    reducedMotion: false,
    ...overrides,
  }
  const view = render(<VoiceLevel {...props} />)
  const meter = () => view.container.querySelector<HTMLElement>('[data-tour="voice-level"]')!
  /** Each bar's height in px, to the hundredth: its scale of the 14 px bar. */
  const heights = () =>
    [...meter().children].map((bar) => {
      const scale = /scaleY\(([\d.]+)\)/.exec((bar as HTMLElement).style.transform)?.[1]
      return scale === undefined ? null : Math.round(Number(scale) * 14 * 100) / 100
    })
  const rerender = (next: Partial<VoiceLevelProps>) =>
    view.rerender(<VoiceLevel {...props} {...next} />)
  return { voice, meter, heights, rerender }
}

const FLAT = [2, 2, 2, 2]

test('four bars, hidden from assistive tech (the captions carry the words)', () => {
  const { meter } = setup({ playing: false })
  expect(meter()).toHaveAttribute('aria-hidden', 'true')
  expect(meter().children).toHaveLength(4)
})

test('paused, it lies flat and says it isn’t speaking, with no animation loop', () => {
  const { voice, meter, heights } = setup({ playing: false })
  voice.ms = 260
  expect(meter()).toHaveAttribute('data-speaking', 'false')
  expect(heights()).toEqual(FLAT)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
})

test('playing, each frame its bars follow the voice’s level at the playhead and just before it', () => {
  const { voice, meter, heights } = setup()
  voice.ms = 260
  nextFrame()
  expect(meter()).toHaveAttribute('data-speaking', 'true')
  // Levels 3, 5, 2, 4: the windows 100, 0, 150 and 50 ms back; each level ÷ 9 of 14 px.
  expect(heights()).toEqual([4.67, 7.78, 3.11, 6.22])
  voice.ms = 460
  nextFrame()
  // Levels 7, 9, 6, 8.
  expect(heights()).toEqual([10.89, 14, 9.33, 12.44])
})

test('a quiet window still shows a 2 px bar, and the windows before the clip are quiet', () => {
  const { voice, meter, heights } = setup()
  voice.ms = 10
  nextFrame()
  expect(meter()).toHaveAttribute('data-speaking', 'true')
  expect(heights()).toEqual(FLAT)
})

test('past the clip (its after-actions, a wait) and before it starts, it lies flat', () => {
  const { voice, meter, heights } = setup()
  voice.ms = 260
  nextFrame()
  // A clip that ran to its end holds its length.
  voice.ms = 500
  nextFrame()
  expect(meter()).toHaveAttribute('data-speaking', 'false')
  expect(heights()).toEqual(FLAT)
  // A stopped voice, between lines.
  voice.ms = 0
  nextFrame()
  expect(meter()).toHaveAttribute('data-speaking', 'false')
  expect(heights()).toEqual(FLAT)
})

test('the loop runs only while playing: a pause stops it and lays the bars flat', () => {
  const { voice, meter, heights, rerender } = setup()
  voice.ms = 260
  nextFrame()
  expect(frames.size).toBe(1)
  rerender({ playing: false })
  expect(frames.size).toBe(0)
  expect(meter()).toHaveAttribute('data-speaking', 'false')
  expect(heights()).toEqual(FLAT)
  // Played again: the loop picks up where the voice is.
  rerender({ playing: true })
  voice.ms = 460
  nextFrame()
  expect(meter()).toHaveAttribute('data-speaking', 'true')
  expect(heights()).toEqual([10.89, 14, 9.33, 12.44])
})

test('a new line’s levels are read from its own clip', () => {
  const { voice, heights, rerender } = setup()
  voice.ms = 260
  nextFrame()
  rerender({ levels: '9999999999' })
  nextFrame()
  expect(heights()).toEqual([14, 14, 14, 14])
})

describe('under reduced motion', () => {
  test('while a clip runs the bars hold still in a fixed profile, with no animation loop', () => {
    const { voice, meter, heights, rerender } = setup({ reducedMotion: true, playing: false })
    voice.ms = 260
    rerender({ playing: true })
    expect(meter()).toHaveAttribute('data-speaking', 'true')
    expect(heights()).toEqual([6, 10, 8, 12])
    // The bar re-renders as the tour plays; the profile doesn't move with the voice.
    voice.ms = 460
    rerender({ playing: true })
    expect(heights()).toEqual([6, 10, 8, 12])
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  test('past the clip, or paused, it lies flat', () => {
    const { voice, meter, heights, rerender } = setup({ reducedMotion: true })
    voice.ms = 500
    rerender({})
    expect(meter()).toHaveAttribute('data-speaking', 'false')
    expect(heights()).toEqual(FLAT)
    voice.ms = 260
    rerender({ playing: false })
    expect(meter()).toHaveAttribute('data-speaking', 'false')
    expect(heights()).toEqual(FLAT)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })
})
