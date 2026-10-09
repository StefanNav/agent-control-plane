import { matchPath } from 'react-router'
import { routeTable } from '../../app/routes'
import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { PERSONAS } from '../personas'
import { scenarioAt } from './engine'
import { STORIES, storyById } from './index'

const GENDERED = /\b(he|she|him|her|his|hers|himself|herself)\b/i
const sentences = (text: string) =>
  text
    .replace(/Dr\./g, 'Dr')
    .split(/[.!?](?:\s|$)/)
    .filter((s) => s.trim()).length
const story = (id: string) => storyById(id)!
const scenarios = (id: string) => story(id).steps.map((_, i) => scenarioAt(story(id), i + 1))

test('one story per persona, in persona order', () => {
  const ids = STORIES.map((s) => s.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).toEqual(PERSONAS.map((p) => p.id).filter((id) => ids.includes(id)))
  for (const s of STORIES) expect(s.personaId).toBe(s.id)
})

describe.each(STORIES.map((s) => [s.id, s] as const))('%s', (_id, s) => {
  test('has 3 to 10 steps', () => {
    expect(s.steps.length).toBeGreaterThanOrEqual(3)
    expect(s.steps.length).toBeLessThanOrEqual(10)
  })

  test('every step is on a real route', () => {
    for (const step of s.steps) {
      const { pathname } = new URL(step.route, 'http://x')
      expect(
        routeTable.some((route) => matchPath(route.path, pathname)),
        step.route,
      ).toBe(true)
    }
  })

  test('targets are plain attribute values', () => {
    for (const step of s.steps) if (step.target) expect(step.target).toMatch(/^[a-z0-9-]+$/)
  })

  test('narration is 2–3 sentences and names people', () => {
    expect(s.summary).not.toMatch(GENDERED)
    for (const step of s.steps) {
      expect(sentences(step.body), step.title).toBeGreaterThanOrEqual(2)
      expect(sentences(step.body), step.title).toBeLessThanOrEqual(3)
      expect(`${step.title} ${step.body}`).not.toMatch(GENDERED)
    }
  })
})

test('Marcus: 9 steps; asking to resume keeps the visitor’s own pause', () => {
  const marcus = story('marcus')
  expect(marcus.steps).toHaveLength(9)
  const resume = marcus.steps[6]!
  expect(resume.scenarioPatch).toBe('med-rec-paused')
  expect(resume.keep!(buildScenario('med-rec-paused'))).toBe(true)
  expect(resume.keep!(createSeed())).toBe(false)
})

test('Priya: 8 steps from the shadow scorecard to the version step-down', () => {
  expect(story('priya').steps).toHaveLength(8)
  expect(scenarios('priya')).toEqual([
    'shadow-day-21',
    'awaiting-signature',
    'baseline',
    'resume-requested',
    'resume-requested',
    'resume-requested',
    'step-down-threshold',
    'step-down-version',
  ])
})

test('Dana: 7 steps from the approved intake', () => {
  expect(story('dana').steps).toHaveLength(7)
  expect(scenarios('dana')).toEqual([
    'onboarding-intake',
    'onboarding-intake',
    'review-risk-tier',
    'baseline',
    'baseline',
    'baseline',
    'baseline',
  ])
})

test('all seven stories, in persona order', () => {
  expect(STORIES.map((s) => s.id)).toEqual(PERSONAS.map((p) => p.id))
})

test('Sam: 5 steps from the tested hard stops to the held build', () => {
  expect(scenarios('sam')).toEqual([
    'onboarding-tools-tested',
    'onboarding-tools-tested',
    'onboarding-returned-hs11',
    'baseline',
    'change-detected-v150',
  ])
})

test('Dr. Lee: 4 steps; the decision step keeps the visitor’s own approval', () => {
  const drlee = story('drlee')
  expect(drlee.steps).toHaveLength(4)
  const logged = drlee.steps[2]!
  expect(logged.scenarioPatch).toBe('review-decided')
  expect(logged.keep!(buildScenario('review-decided'))).toBe(true)
  expect(logged.keep!(buildScenario('review-committee'))).toBe(false)
  expect(scenarios('drlee')[3]).toBe('promotion-at-board')
})

test('Ana: 4 steps, the last nine days later', () => {
  expect(scenarios('ana')).toEqual(['baseline', 'baseline', 'baseline', 'epic-fixed-later'])
})

test('Jordan: 4 steps; the incident is read at 11:58', () => {
  expect(scenarios('jordan')).toEqual([
    'baseline',
    'baseline',
    'resume-requested',
    'resume-requested',
  ])
})
