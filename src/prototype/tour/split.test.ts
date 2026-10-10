import { cutWindows, splitLines, syllables, type Silence } from './split'

/** Every word here is one vowel group, so a line's syllables are its word count. */
const line = (words: number) => Array.from({ length: words }, () => 'ba').join(' ')

const geometricMean = (values: number[]) =>
  Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length)

describe('syllables', () => {
  test('counts the vowel groups in each word, y included', () => {
    expect(syllables('cat')).toBe(1)
    expect(syllables('hello')).toBe(2)
    expect(syllables('Beautiful')).toBe(3)
    expect(syllables('rhythm')).toBe(1)
  })

  test('a word with no vowel group still counts once', () => {
    expect(syllables('mm')).toBe(1)
    expect(syllables('41')).toBe(1)
  })

  test('adds up the words, however they are spaced, and ignores bare punctuation', () => {
    expect(syllables('a cat')).toBe(2)
    expect(syllables("  Hi,   I'm\nStefan. ")).toBe(4)
    expect(syllables('well — done')).toBe(3)
  })

  test('an empty line has none', () => {
    expect(syllables('')).toBe(0)
    expect(syllables('  ')).toBe(0)
  })
})

describe('splitLines', () => {
  test('splits three equal lines at their two long breaks, past the edge silences and a short pause', () => {
    const silences: Silence[] = [
      { start: 0, end: 0.5 },
      { start: 4, end: 4.25 },
      { start: 9.5, end: 10.5 },
      { start: 19.5, end: 20.5 },
      // The last silence ends at the last frame, a little short of the end.
      { start: 29.5, end: 29.9 },
    ]
    const result = splitLines(silences, 30, [line(4), line(4), line(4)])
    expect(result.segments).toEqual([
      { start: 0.5, end: 9.5 },
      { start: 10.5, end: 19.5 },
      { start: 20.5, end: 29.5 },
    ])
    expect(result.confident).toBe(true)
    for (const ratio of result.ratios) expect(ratio).toBeCloseTo(1, 6)
  })

  test('a long pause inside a long line loses to a shorter pause at the right proportional place', () => {
    const silences: Silence[] = [
      { start: 4, end: 4.6 },
      { start: 12, end: 13.5 },
    ]
    const result = splitLines(silences, 20, [line(2), line(8)])
    expect(result.segments).toEqual([
      { start: 0, end: 4 },
      { start: 4.6, end: 20 },
    ])
    expect(result.confident).toBe(true)
  })

  test('with fewer candidate breaks than needed it is not confident and gives no segments', () => {
    const silences: Silence[] = [
      { start: 0, end: 0.4 },
      { start: 10, end: 11 },
      { start: 29.6, end: 30 },
    ]
    expect(splitLines(silences, 30, [line(4), line(4), line(4)])).toEqual({
      segments: [],
      ratios: [],
      confident: false,
    })
  })

  test('a silence that does not touch the start or the end is a candidate, not trimmed', () => {
    const silences: Silence[] = [
      { start: 2, end: 2.5 },
      { start: 10, end: 11 },
      { start: 28, end: 28.4 },
    ]
    const result = splitLines(silences, 30, [line(4), line(4)])
    expect(result.segments).toEqual([
      { start: 0, end: 10 },
      { start: 11, end: 30 },
    ])
  })

  test('ratios are each segment against its expected length, divided by their geometric mean', () => {
    const silences: Silence[] = [
      { start: 6, end: 7 },
      { start: 16, end: 17 },
    ]
    const { ratios, segments } = splitLines(silences, 30, [line(4), line(4), line(4)])
    expect(segments).toEqual([
      { start: 0, end: 6 },
      { start: 7, end: 16 },
      { start: 17, end: 30 },
    ])
    expect(geometricMean(ratios)).toBeCloseTo(1, 9)
    // 6, 9 and 13 seconds for three equally long lines: in that order, each longer than the last.
    expect(ratios[0]).toBeLessThan(ratios[1] ?? 0)
    expect(ratios[1]).toBeLessThan(ratios[2] ?? 0)
    expect(ratios[2]! / ratios[0]!).toBeCloseTo(13 / 6, 9)
  })

  test('the time the breaks take does not skew the ratios', () => {
    const silences: Silence[] = [
      { start: 20, end: 21 },
      { start: 41, end: 42 },
    ]
    const result = splitLines(silences, 62, [line(5), line(5), line(5)])
    expect(result.confident).toBe(true)
    for (const ratio of result.ratios) expect(ratio).toBeCloseTo(1, 6)
  })

  test('is not confident when a segment is far from its expected length, but still returns them', () => {
    const silences: Silence[] = [
      { start: 2, end: 3 },
      { start: 20, end: 21 },
    ]
    const result = splitLines(silences, 30, [line(4), line(4), line(4)])
    expect(result.segments).toHaveLength(3)
    expect(result.ratios.some((ratio) => ratio < 0.6 || ratio > 1.6)).toBe(true)
    expect(result.confident).toBe(false)
  })

  test('one line is the whole speech span', () => {
    const silences: Silence[] = [
      { start: 0, end: 0.3 },
      { start: 8, end: 8.5 },
    ]
    const result = splitLines(silences, 8.5, [line(3)])
    expect(result).toEqual({ segments: [{ start: 0.3, end: 8 }], ratios: [1], confident: true })
  })

  test('no lines is not confident', () => {
    expect(splitLines([], 10, [])).toEqual({ segments: [], ratios: [], confident: false })
  })
})

describe('cutWindows', () => {
  test('pads each segment 0.15 s before and 0.25 s after', () => {
    const windows = cutWindows(
      [
        { start: 1, end: 5 },
        { start: 7, end: 12 },
      ],
      14,
    )
    expect(windows[0]?.start).toBeCloseTo(0.85, 9)
    expect(windows[0]?.end).toBeCloseTo(5.25, 9)
    expect(windows[1]?.start).toBeCloseTo(6.85, 9)
    expect(windows[1]?.end).toBeCloseTo(12.25, 9)
  })

  test('never runs into the next or the previous line, or past the ends of the recording', () => {
    const windows = cutWindows(
      [
        { start: 0.05, end: 5 },
        { start: 5.1, end: 9 },
        { start: 9.1, end: 9.9 },
      ],
      10,
    )
    expect(windows).toEqual([
      { start: 0, end: 5.1 },
      { start: 5, end: 9.1 },
      { start: 9, end: 10 },
    ])
  })

  test('has no windows for no segments', () => {
    expect(cutWindows([], 10)).toEqual([])
  })
})
