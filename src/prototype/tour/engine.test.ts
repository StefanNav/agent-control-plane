import {
  beatAt,
  buildTimeline,
  chapterStart,
  elapsedMs,
  enterStep,
  estimateMs,
  isInterlude,
  nextBeat,
  nextStep,
  prevStep,
  stepAt,
  tourUrlAction,
} from './engine'
import { FIXTURE_CHAPTERS } from './fixtures'
import type { Manifest } from './types'

const chapters = FIXTURE_CHAPTERS
const allBeats = chapters.flatMap((c) => c.steps.flatMap((s) => s.beats))
/** Every beat has a recorded 1000 ms clip. */
const manifest: Manifest = Object.fromEntries(
  allBeats.map((b) => [b.id, { ms: 1000, source: 'recorded' as const, textHash: 'x' }]),
)

describe('reading a position', () => {
  test('beatAt and stepAt read the chapter, step and beat', () => {
    expect(stepAt(chapters, { chapter: 0, step: 1, beat: 0 }).id).toBe('why-screen')
    expect(beatAt(chapters, { chapter: 0, step: 0, beat: 2 }).id).toBe('why-intro-3')
  })

  test('chapterStart is the first beat of the chapter', () => {
    expect(chapterStart(1)).toEqual({ chapter: 1, step: 0, beat: 0 })
  })
})

describe('nextStep', () => {
  test('moves to the next step in the chapter, at beat 0', () => {
    expect(nextStep(chapters, { chapter: 0, step: 0, beat: 2 })).toEqual({
      chapter: 0,
      step: 1,
      beat: 0,
    })
  })

  test('from the last step of a chapter, opens the next chapter', () => {
    expect(nextStep(chapters, { chapter: 0, step: 1, beat: 1 })).toEqual({
      chapter: 1,
      step: 0,
      beat: 0,
    })
  })

  test('from the last step of the last chapter, there is none', () => {
    expect(nextStep(chapters, { chapter: 1, step: 0, beat: 0 })).toBeNull()
  })
})

describe('prevStep', () => {
  test('on the first step of the first chapter, there is none', () => {
    expect(prevStep(chapters, { chapter: 0, step: 0, beat: 2 })).toBeNull()
  })

  test('moves to the step before, at beat 0', () => {
    expect(prevStep(chapters, { chapter: 0, step: 1, beat: 1 })).toEqual({
      chapter: 0,
      step: 0,
      beat: 0,
    })
  })

  test('from the first step of a chapter, lands on the last step of the one before', () => {
    expect(prevStep(chapters, { chapter: 1, step: 0, beat: 1 })).toEqual({
      chapter: 0,
      step: 1,
      beat: 0,
    })
  })
})

describe('nextBeat', () => {
  test('moves within a step', () => {
    expect(nextBeat(chapters, { chapter: 0, step: 0, beat: 0 })).toEqual({
      chapter: 0,
      step: 0,
      beat: 1,
    })
  })

  test('crosses a step boundary', () => {
    expect(nextBeat(chapters, { chapter: 0, step: 0, beat: 2 })).toEqual({
      chapter: 0,
      step: 1,
      beat: 0,
    })
  })

  test('crosses a chapter boundary', () => {
    expect(nextBeat(chapters, { chapter: 0, step: 1, beat: 1 })).toEqual({
      chapter: 1,
      step: 0,
      beat: 0,
    })
  })

  test('after the last beat of the tour, there is none', () => {
    expect(nextBeat(chapters, { chapter: 1, step: 0, beat: 1 })).toBeNull()
  })
})

describe('enterStep', () => {
  test('an interlude loads nothing and sets no persona', () => {
    expect(enterStep(stepAt(chapters, { chapter: 0, step: 0, beat: 0 }))).toEqual({
      load: null,
      persona: null,
      route: '/tour/why',
    })
  })

  test('a product step loads its scenario as its persona', () => {
    expect(enterStep(stepAt(chapters, { chapter: 0, step: 1, beat: 0 }))).toEqual({
      load: 'med-rec-paused',
      persona: 'marcus',
      route: '/operations/agents/med-rec',
    })
  })
})

describe('isInterlude', () => {
  test('is a route under /tour/', () => {
    expect(isInterlude('/tour/why')).toBe(true)
    expect(isInterlude('/operations')).toBe(false)
    expect(isInterlude('/tourist')).toBe(false)
  })
})

describe('estimateMs', () => {
  test('is 400 ms a word, with a floor of 1500', () => {
    expect(estimateMs('one two three')).toBe(1500)
    expect(estimateMs('one two three four five six seven eight nine ten')).toBe(4000)
    expect(estimateMs('')).toBe(1500)
  })

  test('counts words across any whitespace', () => {
    expect(estimateMs('  one\ntwo\t three   four  ')).toBe(1600)
    expect(estimateMs(Array(11).fill('word').join('\n'))).toBe(4400)
  })
})

describe('buildTimeline', () => {
  test('sums the recorded durations', () => {
    const t = buildTimeline(chapters, manifest)
    expect(t.total).toBe(allBeats.length * 1000)
    expect(t.beatMs['why-intro-1']).toBe(1000)
    expect(t.beatStartMs['why-intro-1']).toBe(0)
    expect(t.beatStartMs['why-intro-2']).toBe(1000)
  })

  test('a beat missing from the manifest uses the estimate', () => {
    const missing = allBeats[1]!
    const partial: Manifest = { ...manifest }
    delete partial[missing.id]
    const t = buildTimeline(chapters, partial)
    expect(t.beatMs[missing.id]).toBe(estimateMs(missing.text))
    expect(t.total).toBe((allBeats.length - 1) * 1000 + estimateMs(missing.text))
  })

  test('chapters start where the one before ends', () => {
    const chapter0 = chapters[0]!.steps.flatMap((s) => s.beats)
    const t = buildTimeline(chapters, manifest)
    expect(t.chapterStartMs).toEqual([0, chapter0.length * 1000])
  })

  test('an empty manifest builds a timeline from estimates alone', () => {
    const t = buildTimeline(chapters, {})
    expect(t.total).toBe(allBeats.reduce((sum, b) => sum + estimateMs(b.text), 0))
  })
})

describe('elapsedMs', () => {
  const t = buildTimeline(chapters, manifest)

  test('is the start of the beat plus how far into it', () => {
    expect(elapsedMs(t, chapters, { chapter: 0, step: 0, beat: 0 }, 0)).toBe(0)
    expect(elapsedMs(t, chapters, { chapter: 0, step: 0, beat: 1 }, 250)).toBe(1250)
    expect(elapsedMs(t, chapters, { chapter: 1, step: 0, beat: 0 }, 0)).toBe(t.chapterStartMs[1])
  })

  test('stays inside the beat', () => {
    expect(elapsedMs(t, chapters, { chapter: 0, step: 0, beat: 1 }, 5000)).toBe(2000)
    expect(elapsedMs(t, chapters, { chapter: 0, step: 0, beat: 1 }, -5)).toBe(1000)
  })
})

describe('tourUrlAction', () => {
  const params = (q: string) => new URLSearchParams(q)

  test('no tour param: nothing to do', () => {
    expect(tourUrlAction(params(''), chapters)).toEqual({ kind: 'none' })
    expect(tourUrlAction(params('story=marcus&step=2'), chapters)).toEqual({ kind: 'none' })
  })

  test('a chapter id opens the tour at that chapter', () => {
    expect(tourUrlAction(params('tour=decision-1'), chapters)).toEqual({ kind: 'open', chapter: 1 })
    expect(tourUrlAction(params('tour=why'), chapters)).toEqual({ kind: 'open', chapter: 0 })
  })

  test('an unknown or empty chapter is stripped', () => {
    expect(tourUrlAction(params('tour=nope'), chapters)).toEqual({ kind: 'strip' })
    expect(tourUrlAction(params('tour='), chapters)).toEqual({ kind: 'strip' })
  })
})
