import { inClip, levelAt, LEVEL_WINDOW_MS } from './levels'

describe('levelAt', () => {
  const levels = '0123456789'

  test('reads the digit of the 50 ms window the playhead is in', () => {
    expect(LEVEL_WINDOW_MS).toBe(50)
    expect(levelAt(levels, 0)).toBe(0)
    expect(levelAt(levels, 49.9)).toBe(0)
    expect(levelAt(levels, 50)).toBe(1)
    expect(levelAt(levels, 99)).toBe(1)
    expect(levelAt(levels, 260)).toBe(5)
    expect(levelAt(levels, 499)).toBe(9)
  })

  test('is 0 past the end, before the start and with no levels', () => {
    expect(levelAt(levels, 500)).toBe(0)
    expect(levelAt(levels, 12_000)).toBe(0)
    expect(levelAt(levels, -50)).toBe(0)
    expect(levelAt('', 0)).toBe(0)
    expect(levelAt('', 120)).toBe(0)
  })
})

describe('inClip', () => {
  test('a clip is running once it has started and until it reaches its end', () => {
    expect(inClip(1, 7137)).toBe(true)
    expect(inClip(7136, 7137)).toBe(true)
  })

  test('not before it starts (a stopped voice reads 0), nor at its end, where an ended clip holds', () => {
    expect(inClip(0, 7137)).toBe(false)
    expect(inClip(7137, 7137)).toBe(false)
    expect(inClip(0, 0)).toBe(false)
  })
})
