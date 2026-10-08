import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { reviewRail, selectPacket, selectRiskTier } from './selectors'

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

test('2c: the packet reads the record for the board', async () => {
  const { selectPacket } = await import('./selectors')
  const p = selectPacket(buildScenario('review-committee'), 'med-rec')!
  expect(p.breadcrumb).toBe('Portfolio / AI review board / 14 Oct 2026 / Item 3 of 5')
  expect(p.title).toBe('Med Rec Agent · review packet')
  expect(p.status).toBe('Tier 3 · High')
  expect(p.idLine).toBe('AGT-0123 v1.0 · REQ-0093')
  expect(p.handsOff).toBe('Home list and fill history disagree · patient on dialysis · more than 15 home medications')
  expect(p.never.map((n) => n.code)).toEqual(['HS-04', 'HS-07', 'HS-11', 'ORG-POL-02'])
  expect(p.tier).toBe('Tier 3 · High. Suggested Tier 2. Dana raised it: “Med rec errors carry into every inpatient order. Pharmacist review catches most, not all.”')
  expect(p.state).toBe('open')
  expect(selectPacket(buildScenario('review-risk-tier'), 'med-rec')!.state).toBe('notBuilt')
  expect(selectPacket(createSeed(), 'med-rec')!.state).toBe('decided')
  expect(selectPacket(createSeed(), 'nope')).toBeNull()
})

test('I1 (review): Tier 1 needs no board — the packet says so and the record header stops waiting', async () => {
  const { createDemoStore } = await import('../../store')
  const { createMemoryStorage } = await import('../../store/storage')
  const { selectOnboardingHeader } = await import('../onboarding/selectors')
  const store = createDemoStore(createMemoryStorage())
  store.getState().loadScenario('review-risk-tier')
  store.getState().setPersona('dana')
  store.getState().setRiskTier('med-rec', { tier: 1, reason: 'Pharmacist signs every line.' })
  const s = store.getState()
  expect(selectPacket(s, 'med-rec')!.state).toBe('notNeeded')
  expect(selectOnboardingHeader(s, 'med-rec')).toMatchObject({ status: 'Approved · Tier 1, no board', chip: null })
})

test('I5 (review): the export reads the record as it stood, not December’s facts', async () => {
  const { selectExportContents } = await import('../audit/selectors')
  const rows = Object.fromEntries(selectExportContents(buildScenario('onboarding-ready'), ['med-rec']))
  expect(rows['Committee decisions and conditions']).toBe('—')
  expect(rows['Job description versions']).toBe('1 · v1.0')
  expect(rows['Actions and traces']).not.toMatch(/Dec/)
  expect(Object.fromEntries(selectExportContents(buildScenario('review-decided'), ['med-rec']))['Committee decisions and conditions']).toBe('1 · approved with C1 to C3')
})
