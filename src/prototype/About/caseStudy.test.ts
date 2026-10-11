import { CHAPTERS } from '../tour/script'
import type { Chapter } from '../tour/types'
import { CASE_CHAPTERS, cardIds, liveLink, paragraphs, playLink } from './caseStudy'

const chapter = (id: string) => CHAPTERS.find((c) => c.id === id)!

describe('CASE_CHAPTERS', () => {
  test('is the tour in running order without its close', () => {
    expect(CASE_CHAPTERS.map((c) => c.id)).toEqual(
      CHAPTERS.map((c) => c.id).filter((id) => id !== 'close'),
    )
  })
})

describe('paragraphs', () => {
  test('say every line of the narration, word for word, in order', () => {
    for (const c of CASE_CHAPTERS) {
      const lines = c.steps.flatMap((s) => s.beats.map((b) => b.text))
      expect(
        paragraphs(c)
          .map((p) => p.text)
          .join(' '),
      ).toBe(lines.join(' '))
    }
  })

  test('a product chapter makes one paragraph per step', () => {
    const onboarding = chapter('onboarding')
    expect(paragraphs(onboarding)).toHaveLength(onboarding.steps.length)
    expect(paragraphs(onboarding)[1]!.text).toBe(
      onboarding.steps[1]!.beats.map((b) => b.text).join(' '),
    )
  })

  test('a line that reveals something starts a paragraph and carries what it reveals', () => {
    const decisions = paragraphs(chapter('decisions'))
    expect(decisions.map((p) => p.reveal)).toEqual([
      undefined,
      'd1',
      'd2',
      'directions',
      'judged',
      'd3',
    ])
    expect(decisions[0]!.text).toBe('Three decisions shaped all of this.')
    expect(decisions[2]!.text).toBe("Second, how to protect people's attention.")
  })

  test('the problem chapter breaks where its page brings in a new idea', () => {
    expect(paragraphs(chapter('problem')).map((p) => p.reveal)).toEqual(['act', 'approve', 'trust'])
  })
})

describe('cardIds', () => {
  test('are the cards the narration puts up, in order', () => {
    expect(cardIds(chapter('problem'))).toEqual(['research-r1', 'research-r2', 'research-r3'])
    expect(cardIds(chapter('onboarding'))).toEqual(['hard-stops-outside'])
  })

  test('count a card once, however many lines name it', () => {
    const twice: Chapter = {
      id: 'problem',
      title: 'Twice',
      steps: [
        {
          id: 'twice',
          route: '/tour/problem',
          beats: [
            { id: 'a', text: 'A.', actions: [{ kind: 'card', card: 'research-r1' }] },
            {
              id: 'b',
              text: 'B.',
              actions: [{ kind: 'clearCard' }],
              after: [{ kind: 'card', card: 'research-r1' }],
            },
          ],
        },
      ],
    }
    expect(cardIds(twice)).toEqual(['research-r1'])
  })

  test('a chapter that puts up none has none', () => {
    expect(cardIds(chapter('people'))).toEqual([])
  })
})

describe('links', () => {
  test('Play from here opens the chapter on the tour', () => {
    for (const c of CASE_CHAPTERS) expect(playLink(c)).toBe(`/?tour=${c.id}`)
  })

  test('a product chapter opens its live screen: the matching step of a story', () => {
    const live = (id: string) => liveLink(chapter(id))
    expect(live('open')).toEqual({
      label: 'Open the live screen',
      to: '/operations/agents/med-rec?story=marcus&step=3',
    })
    expect(live('onboarding')?.to).toBe(
      '/inventory/agents/med-rec/onboarding/intake?story=dana&step=1',
    )
    expect(live('earning-trust')?.to).toBe('/inventory/privileges/prv-0142/sign?story=priya&step=2')
    expect(live('supervising')?.to).toBe(
      '/operations/agents/med-rec?control=pause-agent&story=marcus&step=6',
    )
    expect(live('step-down')?.to).toBe('/operations/agents/med-rec?story=priya&step=7')
  })

  test('an interlude opens its page', () => {
    expect(liveLink(chapter('problem'))).toEqual({ label: 'Open the page', to: '/tour/problem' })
    expect(liveLink(chapter('decisions'))?.to).toBe('/tour/decisions')
    expect(liveLink(chapter('process'))?.to).toBe('/tour/process')
    expect(liveLink(chapter('validate'))?.to).toBe('/tour/validate')
  })

  test('Who it’s for has no second link', () => {
    expect(liveLink(chapter('people'))).toBeNull()
  })
})
