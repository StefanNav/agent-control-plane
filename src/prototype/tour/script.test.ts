import { matchPath } from 'react-router'
import { routeTable } from '../../app/routes'
import { SCENARIO_IDS } from '../../data/scenarios'
import { PERSONA_IDS } from '../../data/types'
import { CARDS } from './cards'
import { isInterlude } from './engine'
import { textHash } from './hash'
import { MANIFEST } from './manifest'
import { runningMs } from './runningTime'
import { CHAPTERS } from './script'
import type { ChapterId } from './types'

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

test('every clip is recorded, from its line as the script has it now (a caption edit needs a new take)', () => {
  for (const beat of beats) {
    expect(MANIFEST[beat.id]?.source, beat.id).toBe('recorded')
    expect(MANIFEST[beat.id]?.textHash, beat.id).toBe(textHash(beat.text))
  }
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

test('the whole tour runs 7:30 at most, by its clips and what its actions add (Ruling 27)', () => {
  // With every chapter in Stefan's voice, the model gives 7:15, so the ceiling stays at 7:30
  // (Ruling 28 would raise it to 8:30 only past that).
  expect(runningMs(CHAPTERS, MANIFEST)).toBeLessThanOrEqual(450_000)
})
