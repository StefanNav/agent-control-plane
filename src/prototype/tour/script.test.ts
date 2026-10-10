import { matchPath } from 'react-router'
import { routeTable } from '../../app/routes'
import { SCENARIO_IDS } from '../../data/scenarios'
import { PERSONA_IDS } from '../../data/types'
import { CARDS } from './cards'
import { buildTimeline, isInterlude } from './engine'
import { MANIFEST } from './manifest'
import { CHAPTERS } from './script'
import type { Beat, ChapterId, TourAction } from './types'

const GENDERED = /\b(he|she|him|her|his|hers|himself|herself)\b/i
const steps = CHAPTERS.flatMap((c) => c.steps)
const beats = steps.flatMap((s) => s.beats)
const actions = beats.flatMap((b) => [...(b.actions ?? []), ...(b.after ?? [])])

test('every chapter has a step and every step a beat', () => {
  for (const chapter of CHAPTERS) expect(chapter.steps.length, chapter.id).toBeGreaterThan(0)
  for (const step of steps) expect(step.beats.length, step.id).toBeGreaterThan(0)
})

test('chapter and beat ids are unique', () => {
  const chapters = CHAPTERS.map((c) => c.id)
  expect(new Set(chapters).size).toBe(chapters.length)
  const ids = beats.map((b) => b.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('all eleven chapters run in the script’s order (R1)', () => {
  const ORDER: ChapterId[] = [
    'open',
    'problem',
    'people',
    'onboarding',
    'earning-trust',
    'supervising',
    'step-down',
    'decisions',
    'process',
    'validate',
    'close',
  ]
  expect(CHAPTERS.map((c) => c.id)).toEqual(ORDER)
})

test('an interlude loads no scenario and no persona, and only an interlude reveals', () => {
  for (const step of steps) {
    if (isInterlude(step.route)) {
      expect(step.scenario, step.id).toBeUndefined()
      expect(step.persona, step.id).toBeUndefined()
    } else {
      for (const beat of step.beats) expect(beat.reveal, beat.id).toBeUndefined()
    }
  }
})

test('the tour ends on the landing page (R5)', () => {
  expect(steps.at(-1)?.route).toBe('/')
})

test('an excerpt that isn’t a product principle cites only “Research notes · …”', () => {
  for (const card of Object.values(CARDS)) {
    if (card.kind !== 'excerpt' || card.source === 'Product principles') continue
    expect(card.source).toMatch(/^Research notes · \S/)
  }
})

test('every beat has a clip in the manifest (run `pnpm tour:audio`)', () => {
  for (const beat of beats) expect(MANIFEST[beat.id], beat.id).toBeDefined()
})

test('every step loads a real scenario as a real persona, on a real route', () => {
  for (const step of steps) {
    if (step.scenario !== undefined) expect(SCENARIO_IDS, step.id).toContain(step.scenario)
    if (step.persona !== undefined) expect(PERSONA_IDS, step.id).toContain(step.persona)
    const { pathname } = new URL(step.route, 'http://x')
    expect(
      routeTable.some((route) => matchPath(route.path, pathname)),
      step.route,
    ).toBe(true)
  }
})

test('narration names people', () => {
  for (const beat of beats) expect(beat.text, beat.id).not.toMatch(GENDERED)
})

test('what the tour types names people too', () => {
  for (const action of actions)
    if (action.kind === 'type') expect(action.text, action.target).not.toMatch(GENDERED)
})

test('targets are plain attribute values and cards exist', () => {
  for (const action of actions) {
    if ('target' in action) expect(action.target).toMatch(/^[a-z0-9-]+$/)
    if (action.kind === 'card') expect(Object.keys(CARDS)).toContain(action.card)
  }
})

test('the decisions page brings in each decision, then the explorations, as the narration names them', () => {
  const page = steps.find((s) => s.route === '/tour/decisions')!
  expect(page.beats.map((b) => `${b.id}${b.reveal ? ` ${b.reveal}` : ''}`)).toEqual([
    'decisions-1',
    'decisions-2 d1',
    'decisions-3',
    'decisions-4',
    'decisions-5 d2',
    'decisions-6 directions',
    'decisions-7 judged',
    'decisions-8 d3',
    'decisions-9',
    'decisions-10',
  ])
})

/** What a press of the cursor adds to the running time: its glide and the page answering. */
const PRESS_MS = 650

/** Typing, per character at 1× (R3). */
const TYPE_MS = 25

/** How long a list of actions takes to run (Ruling 27): presses, waits and typing; the rest take no time. */
function actionsMs(list: TourAction[] = []): number {
  let ms = 0
  for (const action of list) {
    if (action.kind === 'click' || action.kind === 'choose') ms += PRESS_MS
    else if (action.kind === 'wait') ms += action.ms
    else if (action.kind === 'type') ms += action.text.length * TYPE_MS
  }
  return ms
}

/**
 * A beat's running time (Ruling 27): its clip and its actions start together, and the beat runs on
 * until both are done; then its after-actions run.
 */
function runningMs(beat: Beat, clipMs: number): number {
  return Math.max(clipMs, actionsMs(beat.actions)) + actionsMs(beat.after)
}

test('a beat runs for its clip or its actions, whichever is longer, then its after-actions', () => {
  const beat: Beat = {
    id: 'x',
    text: 'x',
    actions: [
      { kind: 'outline', target: 'a' },
      { kind: 'click', target: 'b' },
      { kind: 'type', target: 'c', text: 'abcd' },
    ],
    after: [
      { kind: 'click', target: 'd' },
      { kind: 'wait', ms: 1500 },
    ],
  }
  // Actions 650 + 4 × 25 = 750, inside a 2000 ms clip; after 650 + 1500.
  expect(runningMs(beat, 2000)).toBe(2000 + 2150)
  // Actions that outlast the clip set the pace.
  expect(runningMs(beat, 500)).toBe(750 + 2150)
  expect(runningMs({ id: 'y', text: 'y', actions: [{ kind: 'wait', ms: 3000 }] }, 2000)).toBe(3000)
})

test('the whole tour runs 7:30 at most, by its clips and what its actions add (Ruling 27)', () => {
  // With every chapter in, the model gives 6:59 (decisions on placeholders; about 7:15 with its
  // recording), so the ceiling stays at 7:30 (Ruling 28 would raise it to 8:30 only past that).
  const { beatMs } = buildTimeline(CHAPTERS, MANIFEST)
  const total = beats.reduce((sum, beat) => sum + runningMs(beat, beatMs[beat.id]!), 0)
  expect(total).toBeLessThanOrEqual(450_000)
})
