import { matchPath } from 'react-router'
import { routeTable } from '../../app/routes'
import { SCENARIO_IDS } from '../../data/scenarios'
import { PERSONA_IDS } from '../../data/types'
import { CARDS } from './cards'
import { buildTimeline } from './engine'
import { MANIFEST } from './manifest'
import { CHAPTERS } from './script'

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

/**
 * What a press of the cursor adds to the running time: its glide and the page answering. After-actions
 * run once the clip has ended; a click or choose among a beat's actions can outlast it.
 */
const PRESS_MS = 650

test('the whole tour runs 7:30 at most, allowing for its clicks and waits', () => {
  const presses = beats.flatMap((b) => [
    ...(b.after ?? []).filter((a) => a.kind !== 'wait'),
    ...(b.actions ?? []).filter((a) => a.kind === 'click' || a.kind === 'choose'),
  ]).length
  // Every wait counts in full (at 1×), wherever it is.
  const waits = actions.reduce((sum, a) => sum + (a.kind === 'wait' ? a.ms : 0), 0)
  const total = buildTimeline(CHAPTERS, MANIFEST).total
  expect(total + presses * PRESS_MS + waits).toBeLessThanOrEqual(450_000)
})
