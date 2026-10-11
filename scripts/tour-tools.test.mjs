// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { levelDigit, levelsFit, levelsFromAstats } from './tour-tools.mjs'

describe('levelDigit', () => {
  // −44 dB to −4 dB: the clips' room tone (−50 to −44 dB) reads 0, and 7–9 are about a quarter of
  // the windows with speech in them, so the bars move through their whole range.
  test('silence, and the room tone at −44 dB or quieter, is 0', () => {
    expect(levelDigit(-Infinity)).toBe(0)
    expect(levelDigit(-44)).toBe(0)
    expect(levelDigit(-47.3)).toBe(0)
    expect(levelDigit(-86.2)).toBe(0)
  })

  test('−4 dB or louder is 9', () => {
    expect(levelDigit(-4)).toBe(9)
    expect(levelDigit(0)).toBe(9)
    expect(levelDigit(3)).toBe(9)
  })

  test('in between it is linear, rounded to the nearest digit', () => {
    // (db + 44) / 40 × 9
    expect(levelDigit(-42)).toBe(0) // 0.45: still a pause
    expect(levelDigit(-41.5)).toBe(1) // 0.56
    expect(levelDigit(-24)).toBe(5) // 4.5
    expect(levelDigit(-16)).toBe(6) // 6.3
    expect(levelDigit(-15)).toBe(7) // 6.53
    expect(levelDigit(-8)).toBe(8) // 8.1
    expect(levelDigit(-5)).toBe(9) // 8.78
  })

  test('a reading that isn’t a number is silence', () => {
    expect(levelDigit(Number.NaN)).toBe(0)
  })
})

describe('levelsFromAstats', () => {
  test('one digit per window, from ffmpeg’s printed RMS levels, in order', () => {
    // As `ametadata=print:…:file=-` writes it for a clip's first 50 ms windows.
    const text = [
      'frame:0    pts:0       pts_time:0',
      'lavfi.astats.Overall.RMS_level=-49.335452',
      'frame:1    pts:2205    pts_time:0.05',
      'lavfi.astats.Overall.RMS_level=-50.202198',
      'frame:2    pts:4410    pts_time:0.1',
      'lavfi.astats.Overall.RMS_level=-34.671993',
      'frame:3    pts:6615    pts_time:0.15',
      'lavfi.astats.Overall.RMS_level=-11.187899',
      'frame:4    pts:8820    pts_time:0.2',
      'lavfi.astats.Overall.RMS_level=-inf',
      'frame:5    pts:11025   pts_time:0.25',
      'lavfi.astats.Overall.RMS_level=-12.871356',
      '',
    ].join('\n')
    expect(levelsFromAstats(text)).toBe('002707')
  })

  test('no readings, no levels', () => {
    expect(levelsFromAstats('')).toBe('')
    expect(levelsFromAstats('frame:0    pts:0       pts_time:0\n')).toBe('')
  })
})

describe('levelsFit', () => {
  // A 7137 ms clip has ceil(7137 / 50) = 143 windows.
  const digits = (n) => '3'.repeat(n)

  test('digits within 2 windows of the clip’s length fit it', () => {
    for (const n of [141, 142, 143, 144, 145])
      expect(levelsFit(digits(n), 7137), String(n)).toBe(true)
  })

  test('more than 2 windows off does not', () => {
    expect(levelsFit(digits(140), 7137)).toBe(false)
    expect(levelsFit(digits(146), 7137)).toBe(false)
  })

  test('missing, empty or not digits does not', () => {
    expect(levelsFit(undefined, 100)).toBe(false)
    expect(levelsFit('', 100)).toBe(false)
    expect(levelsFit('12a', 150)).toBe(false)
    expect(levelsFit(123, 150)).toBe(false)
  })
})
