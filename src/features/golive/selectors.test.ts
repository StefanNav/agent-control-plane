import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { shadowProgress } from '../../store/onboardingRules'
import { selectCase, selectScorecard } from './selectors'

test('3a: the shadow scorecard on day 21 of 21', () => {
  const s = buildScenario('shadow-day-21')
  expect(s.now).toBe('2026-11-05T09:30:00')
  const card = selectScorecard(s, 'med-rec', 'med-rec-admission')!
  expect(card.line).toBe('21 days · 1,118 admissions · 15 Oct to 04 Nov · each draft compared with the admitting pharmacist’s final list')
  expect(card.criteria.map((c) => [c.label, c.target, c.result, c.status])).toEqual([
    ['Agreement with the pharmacist’s list', '≥ 90.0 %', '91.2 %', 'Met'],
    ['Omitted home medications', '≤ 3.0 %', '2.1 %', 'Met'],
    ['Inaccurate lines', '≤ 2.0 %', '2.6 %', 'Below target'],
  ])
  expect(card.causesTitle).toBe('Inaccurate lines by cause · 29 lines')
  expect(card.cases[1]).toMatchObject({ id: 'enc-4105', encounter: '4105', unit: '7 West', homeMeds: 7, agreement: '71 %', differences: '1 inaccurate · 1 omitted' })
  expect(card.golive).toMatchObject({ state: 'ask', summary: '2 of 3 targets met. Priya can still sign, with a written reason that stays on the privilege. Or extend shadow and fix the name mapping first.' })
  expect(shadowProgress(s, 'med-rec-admission')).toMatchObject({ label: 'day 21 of 21', done: true })
})

test('at baseline: admission went to Draft on 06 Nov; allergy is on day 54 with every target met', () => {
  const s = createSeed()
  expect(selectScorecard(s, 'med-rec', 'med-rec-admission')!.golive).toMatchObject({ state: 'signed', signed: 'Priya signed Shadow → Draft · 06 Nov' })
  expect(shadowProgress(s, 'med-rec-allergy')).toMatchObject({ label: 'day 54 · 21-day minimum met', done: true })
  expect(selectScorecard(s, 'med-rec', 'med-rec-allergy')!.golive.state).toBe('ask')
})

test('3b: case 2 of 12, side by side', () => {
  const c = selectCase(buildScenario('shadow-day-21'), 'med-rec', 'enc-4105')!
  expect(c).toMatchObject({ position: 'Case 2 of 12', title: 'Encounter 4105 · 7 West', admitted: 'Admitted 28 Oct 14:12', ids: 'MRN ••3307 · 81 y', chip: '1 inaccurate · 1 omitted', prev: 'enc-4022', next: 'enc-4231' })
  expect(c.source).toBe('Agent draft at 14:13, one minute after admission · pharmacist’s final list signed by Ana R. at 15:02')
  expect(c.totals).toBe('7 lines · 5 agree · 1 inaccurate · 1 omitted. Counted against the targets Marcus set in the job description.')
  expect(selectCase(buildScenario('shadow-day-21'), 'med-rec', 'nope')).toBeNull()
  expect(selectCase(buildScenario('shadow-day-21'), 'renal-dosing', 'enc-4105')).toBeNull()
})
