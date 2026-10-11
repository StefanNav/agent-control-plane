// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { levelDigit, levelsFit, levelsFromAstats } from './tour-tools.mjs'

describe('levelDigit', () => {
  test('silence, and anything at −50 dB or quieter, is 0', () => {
    expect(levelDigit(-Infinity)).toBe(0)
    expect(levelDigit(-50)).toBe(0)
    expect(levelDigit(-86.2)).toBe(0)
  })

  test('−12 dB or louder is 9', () => {
    expect(levelDigit(-12)).toBe(9)
    expect(levelDigit(-5.4)).toBe(9)
    expect(levelDigit(0)).toBe(9)
    expect(levelDigit(3)).toBe(9)
  })

  test('in between it is linear, rounded to the nearest digit', () => {
    // (db + 50) / 38 × 9
    expect(levelDigit(-31)).toBe(5) // 4.5
    expect(levelDigit(-40)).toBe(2) // 2.37
    expect(levelDigit(-39)).toBe(3) // 2.61
    expect(levelDigit(-47.9)).toBe(0) // 0.50 − a hair
    expect(levelDigit(-46)).toBe(1) // 0.95
    expect(levelDigit(-12.9)).toBe(9) // 8.79
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
    expect(levelsFromAstats(text)).toBe('004909')
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
