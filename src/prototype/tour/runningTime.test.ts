import { actionsMs, beatRunningMs, PRESS_MS, runningMs, TYPE_MS } from './runningTime'
import type { Beat, Chapter, Manifest } from './types'

const beat = (extra: Partial<Beat> = {}): Beat => ({ id: 'x', text: 'x', ...extra })

test('a press takes its glide and the page answering, typing 25 ms a character, a wait its time', () => {
  expect(PRESS_MS).toBe(650)
  expect(TYPE_MS).toBe(25)
  expect(
    actionsMs([
      { kind: 'click', target: 'a' },
      { kind: 'choose', target: 'b', value: 'v' },
      { kind: 'type', target: 'c', text: 'abcd' },
      { kind: 'wait', ms: 1500 },
    ]),
  ).toBe(650 + 650 + 4 * 25 + 1500)
})

test('outlines, scrolls and cards take no time, and no actions at all take none', () => {
  expect(actionsMs()).toBe(0)
  expect(
    actionsMs([
      { kind: 'outline', target: 'a' },
      { kind: 'scroll', target: 'a' },
      { kind: 'card', card: 'research-r1' },
      { kind: 'clearCard' },
    ]),
  ).toBe(0)
})

test('a beat whose clip is longer than its actions runs for its clip', () => {
  const quick = beat({ actions: [{ kind: 'click', target: 'a' }] })
  expect(beatRunningMs(quick, 2000)).toBe(2000)
})

test('a beat whose actions are longer than its clip runs for its actions', () => {
  const long = beat({
    actions: [
      { kind: 'click', target: 'a' },
      { kind: 'type', target: 'b', text: 'abcd' },
    ],
  })
  // 650 + 4 × 25 = 750 against a 500 ms clip.
  expect(beatRunningMs(long, 500)).toBe(750)
  expect(beatRunningMs(beat({ actions: [{ kind: 'wait', ms: 3000 }] }), 2000)).toBe(3000)
})

test('a beat’s after-actions run once its clip and actions are done, so they add to it', () => {
  const clicked = beat({
    actions: [{ kind: 'click', target: 'b' }],
    after: [
      { kind: 'click', target: 'd' },
      { kind: 'wait', ms: 1500 },
    ],
  })
  expect(beatRunningMs(clicked, 2000)).toBe(2000 + 650 + 1500)
  // Even when the actions outlast the clip.
  expect(beatRunningMs(clicked, 100)).toBe(650 + 650 + 1500)
})

test('the tour runs for the sum of its beats, with the estimate for a line with no clip yet', () => {
  const chapters: Chapter[] = [
    {
      id: 'open',
      title: 'One',
      steps: [
        {
          id: 'one',
          route: '/',
          beats: [
            beat({
              id: 'a',
              actions: [{ kind: 'click', target: 'a' }],
              after: [{ kind: 'click', target: 'b' }],
            }),
          ],
        },
      ],
    },
    {
      id: 'problem',
      title: 'Two',
      steps: [
        {
          id: 'two',
          route: '/',
          // Six words, no clip: 6 × 400 = 2400 ms, under its 3000 ms wait.
          beats: [
            beat({
              id: 'b',
              text: 'one two three four five six',
              actions: [{ kind: 'wait', ms: 3000 }],
            }),
          ],
        },
      ],
    },
  ]
  const manifest: Manifest = { a: { ms: 2000, source: 'recorded', textHash: 'x', levels: '' } }
  expect(runningMs(chapters, manifest)).toBe(2000 + 650 + 3000)
})
