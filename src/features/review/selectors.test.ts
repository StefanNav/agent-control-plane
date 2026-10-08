import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { reviewRail, selectRiskTier } from './selectors'

test('2b: the AIMS Review rail before the tier is set', () => {
  const s = buildScenario('review-risk-tier')
  expect(s.now).toBe('2026-10-13T10:15:00')
  expect(reviewRail(s, 'med-rec').map((r) => [r.label, r.sub, r.mark])).toEqual([
    ['1 · Onboarding', 'done 07 Oct', 'done'],
    ['2 · Risk tier', 'Dana · now', 'todo'],
    ['3 · Committee packet', 'Dana · after tier', 'none'],
    ['4 · Committee decision', 'Dr. Lee · 14 Oct', 'none'],
    ['5 · Shadow', 'after approval', 'none'],
  ])
})

test('2d at baseline: every step done, shadow ran 15 Oct to 04 Nov', () => {
  expect(reviewRail(createSeed(), 'med-rec').map((r) => r.sub)).toEqual(['done 07 Oct', 'Dana · 13 Oct', 'Dana · 13 Oct', 'Dr. Lee · 14 Oct', 'Marcus · 15 Oct to 04 Nov'])
})

test('2b: what Tier 3 sets against the suggested Tier 2', () => {
  const view = selectRiskTier(buildScenario('review-risk-tier'), 'med-rec', 3)!
  expect(view.suggested).toBe(2)
  expect(view.compare).toEqual({
    head: ['Tier 2', 'Tier 3'],
    rows: [
      ['Shadow minimum', '14 days', '21 days'],
      ['Board', 'Chair', 'Full board'],
      ['Privilege review', '180 days', '90 days'],
      ['Promotion above Draft', 'Sponsor', 'Board'],
    ],
    note: 'The intake already asked for a 21-day shadow, so Tier 3 changes the board and the review cycle, not the shadow length.',
  })
  expect(view.button).toBe('Set Tier 3 and build the packet')
  expect(selectRiskTier(buildScenario('review-risk-tier'), 'med-rec', 1)!.button).toBe('Set Tier 1 and start shadow')
})
