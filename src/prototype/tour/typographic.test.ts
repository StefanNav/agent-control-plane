import { typographic } from './typographic'
import { CHAPTERS } from './script'

describe('typographic', () => {
  test('an apostrophe inside a word becomes ’', () => {
    expect(
      typographic("I don't think it's Priya's, and I'd say you're right. I'm sure I'll check."),
    ).toBe('I don’t think it’s Priya’s, and I’d say you’re right. I’m sure I’ll check.')
  })

  test('so does one that ends a word, as in a plural possessive', () => {
    expect(typographic("This morning it tried to change three patients' doses.")).toBe(
      'This morning it tried to change three patients’ doses.',
    )
  })

  test('a quote that opens is turned the other way from the one that closes', () => {
    expect(typographic("start in a 'shadow-like' mode, then 'earn' autonomy.")).toBe(
      'start in a ‘shadow-like’ mode, then ‘earn’ autonomy.',
    )
    expect(typographic("'Earn' it.")).toBe('‘Earn’ it.')
    expect(typographic('She said "no dose changes" and "never".')).toBe(
      'She said “no dose changes” and “never”.',
    )
    expect(typographic('A line ("not its own") and a dash—"quoted".')).toBe(
      'A line (“not its own”) and a dash—“quoted”.',
    )
  })

  test('text without quotes comes back as it was', () => {
    const plain = 'Seven people use it, each with a different job: 41 agents, 5 divisions.'
    expect(typographic(plain)).toBe(plain)
    expect(typographic('')).toBe('')
  })

  test('every line of the script comes out with only ’ for its apostrophes', () => {
    for (const chapter of CHAPTERS)
      for (const step of chapter.steps)
        for (const beat of step.beats) {
          const shown = typographic(beat.text)
          expect(shown, beat.id).not.toMatch(/['"]/)
          // No line opens with a quote, so none gets an opening one.
          expect(shown, beat.id).not.toMatch(/[‘“]/)
          expect(shown.replaceAll('’', "'"), beat.id).toBe(beat.text)
        }
  })
})
