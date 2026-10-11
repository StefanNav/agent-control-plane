import {
  chapterVerdict,
  cutWindows,
  fitChapter,
  speechWindow,
  splitLines,
  syllables,
  type Silence,
} from './split'

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
      cost: Infinity,
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
    expect(result).toEqual({
      segments: [{ start: 0.3, end: 8 }],
      ratios: [1],
      confident: true,
      cost: 0,
    })
  })

  test('no lines is not confident', () => {
    expect(splitLines([], 10, [])).toEqual({
      segments: [],
      ratios: [],
      confident: false,
      cost: Infinity,
    })
  })
})

describe('splitLines cost', () => {
  test('is what the chosen split costs: lines off their expected length cost more', () => {
    const even: Silence[] = [
      { start: 10, end: 11 },
      { start: 21, end: 22 },
    ]
    const uneven: Silence[] = [
      { start: 4, end: 5 },
      { start: 21, end: 22 },
    ]
    const lines = [line(4), line(4), line(4)]
    // One-second breaks earn nothing, so the cost is how far the lines are from their lengths.
    const evenCost = splitLines(even, 32, lines).cost
    expect(evenCost).toBeLessThan(0.05)
    expect(splitLines(uneven, 32, lines).cost).toBeGreaterThan(evenCost + 1)
  })
})

/**
 * A real chapter recording (Ruling 21): seven lines in the script, but the narrator didn't record the
 * first, so only six are spoken. Its pauses as ffmpeg reported them.
 */
const SEVEN_LINES = [
  "So let's go back to how the agent you saw earlier got here.",
  "It starts on October first, when the hospital's AI committee approves the request for it, and Dana starts onboarding from that approval.",
  'No agent goes live without four named people who answer for it.',
  'Marcus writes down what it must never do, starting with never changing a dose.',
  "Sam turns each of those into a hard stop that sits outside the AI, so the agent can't argue its way past it.",
  'And each one is tested against the last thirty days, so the board can see what it would actually have caught.',
  "Dr. Lee's board approves it with conditions, like a pharmacist signing every draft.",
]
const SIX_SPOKEN: Silence[] = [
  { start: 0, end: 1.195812 },
  { start: 1.195979, end: 1.523104 },
  { start: 2.97975, end: 3.357167 },
  { start: 5.262937, end: 5.475125 },
  { start: 6.261563, end: 6.476229 },
  { start: 6.619687, end: 7.467875 },
  { start: 8.044, end: 8.360354 },
  { start: 9.161958, end: 9.429396 },
  { start: 10.065396, end: 11.589604 },
  { start: 12.827146, end: 13.056208 },
  { start: 13.305312, end: 13.552521 },
  { start: 15.673562, end: 18.199458 },
  { start: 19.185479, end: 19.401083 },
  { start: 20.536917, end: 21.306062 },
  { start: 21.904812, end: 22.278333 },
  { start: 23.615479, end: 25.021562 },
  { start: 25.720208, end: 26.156042 },
  { start: 27.855542, end: 28.352438 },
  { start: 29.754229, end: 30.567312 },
  { start: 30.839292, end: 31.334521 },
  { start: 31.897604, end: 32.431042 },
  { start: 33.862979, end: 36.071833 },
  { start: 38.949833, end: 39.70475 },
  { start: 40.815208, end: 41.102 },
  { start: 42.543542, end: 44.471979 },
  { start: 45.111458, end: 45.432521 },
  { start: 46.338042, end: 46.810708 },
  { start: 47.580479, end: 48.136458 },
  { start: 50.244083, end: 52.673375 },
]
const SIX_SPOKEN_TOTAL = 52.736

describe('fitChapter', () => {
  test('with no line recorded on its own, fits every line', () => {
    const silences: Silence[] = [
      { start: 10, end: 11 },
      { start: 21, end: 22 },
    ]
    const fit = fitChapter(silences, 32, [line(4), line(4), line(4)], [false, false, false])
    expect(fit).toEqual({
      ...splitLines(silences, 32, [line(4), line(4), line(4)]),
      over: 'all',
      lineIndexes: [0, 1, 2],
    })
  })

  test('a first line recorded on its own and missing from the chapter: fitting the rest is confident, and kept', () => {
    const all = splitLines(SIX_SPOKEN, SIX_SPOKEN_TOTAL, SEVEN_LINES)
    expect(all.confident).toBe(false)

    const own = SEVEN_LINES.map((_, i) => i === 0)
    const fit = fitChapter(SIX_SPOKEN, SIX_SPOKEN_TOTAL, SEVEN_LINES, own)
    expect(fit.over).toBe('unrecorded')
    expect(fit.confident).toBe(true)
    expect(fit.lineIndexes).toEqual([1, 2, 3, 4, 5, 6])
    expect(fit.segments).toHaveLength(6)
    // Each line starts after one of the long pauses.
    expect(fit.segments.map((segment) => Number(segment.start.toFixed(2)))).toEqual([
      1.2, 11.59, 18.2, 25.02, 36.07, 44.47,
    ])
  })

  test('a chapter that still holds the line recorded on its own: both fits are confident, the cheaper wins', () => {
    const silences: Silence[] = [
      { start: 10, end: 11 },
      { start: 21, end: 22 },
    ]
    const lines = [line(4), line(4), line(4)]
    const own = [true, false, false]
    const unrecorded = splitLines(silences, 32, [line(4), line(4)])
    const all = splitLines(silences, 32, lines)
    expect(unrecorded.confident && all.confident).toBe(true)
    expect(all.cost).toBeLessThan(unrecorded.cost)
    expect(fitChapter(silences, 32, lines, own)).toEqual({
      ...all,
      over: 'all',
      lineIndexes: [0, 1, 2],
    })
  })

  test('a confident fit wins over a doubtful one, however cheap', () => {
    const silences: Silence[] = [
      { start: 4, end: 4.8 },
      { start: 6.8, end: 10.1 },
    ]
    const lines = [line(6), line(1), line(5)]
    const all = splitLines(silences, 13.1, lines)
    const unrecorded = splitLines(silences, 13.1, [line(1), line(5)])
    expect(all.confident).toBe(false)
    expect(unrecorded.confident).toBe(true)
    expect(all.cost).toBeLessThan(unrecorded.cost)
    expect(fitChapter(silences, 13.1, lines, [true, false, false])).toEqual({
      ...unrecorded,
      over: 'unrecorded',
      lineIndexes: [1, 2],
    })
  })
})

describe('chapterVerdict (Ruling 20)', () => {
  const confident = { segments: [{ start: 0, end: 5 }], ratios: [1], confident: true, cost: 0 }
  const doubtful = { ...confident, ratios: [0.4], confident: false, cost: 1 }
  const nowhere = { segments: [], ratios: [], confident: false, cost: Infinity }

  test('a confident fit is imported: OK', () => {
    expect(chapterVerdict(confident, 7, false)).toEqual({ imported: true, verdict: 'OK', note: '' })
  })

  test('a doubtful fit is not imported unless forced', () => {
    expect(chapterVerdict(doubtful, 7, false)).toEqual({
      imported: false,
      verdict: 'CHECK',
      note: 'not imported; listen and use --force, or fix the recording',
    })
    expect(chapterVerdict(doubtful, 7, true)).toEqual({
      imported: true,
      verdict: 'CHECK',
      note: 'imported with --force',
    })
  })

  test('a recording with too few pauses to cut is never imported, even forced', () => {
    for (const force of [false, true])
      expect(chapterVerdict(nowhere, 7, force)).toEqual({
        imported: false,
        verdict: 'CHECK',
        note: "not imported; couldn't find 6 breaks between the lines",
      })
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

describe('speechWindow (Ruling 26)', () => {
  test('trims the room tone at both ends, keeping 0.15 s before and 0.25 s after the speech', () => {
    const window = speechWindow(
      [
        { start: 0, end: 1.2 },
        { start: 4.7, end: 5.8 },
      ],
      5.8,
    )
    expect(window.start).toBeCloseTo(1.05, 9)
    expect(window.end).toBeCloseTo(4.95, 9)
  })

  test('takes a silence within 0.25 s of either end as that end, as a chapter split does', () => {
    // Voice Memos reports the last silence ending a frame short of the file's end.
    const window = speechWindow(
      [
        { start: 0.2, end: 1 },
        { start: 3, end: 5.65 },
      ],
      5.8,
    )
    expect(window.start).toBeCloseTo(0.85, 9)
    expect(window.end).toBeCloseTo(3.25, 9)
  })

  test('keeps a pause inside the line, and a silence that starts too late to be the lead-in', () => {
    const silences = [
      { start: 0.4, end: 1 },
      { start: 2, end: 2.5 },
    ]
    expect(speechWindow(silences, 4)).toEqual({ start: 0, end: 4 })
  })

  test('never pads past the ends of the recording', () => {
    const window = speechWindow(
      [
        { start: 0, end: 0.1 },
        { start: 3.9, end: 4 },
      ],
      4,
    )
    expect(window).toEqual({ start: 0, end: 4 })
  })

  test('a recording with no silence, or nothing but silence, is kept whole', () => {
    expect(speechWindow([], 3)).toEqual({ start: 0, end: 3 })
    expect(speechWindow([{ start: 0, end: 3 }], 3)).toEqual({ start: 0, end: 3 })
  })
})
