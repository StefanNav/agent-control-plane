import { applyDivisionSettings } from '../../store/settings'
import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { shadowProgress } from '../../store/onboardingRules'
import { selectCase, selectMyPrivileges, selectScorecard } from './selectors'

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

test('3d: Priya’s privileges, soonest review first', async () => {
  const { selectMyPrivileges } = await import('./selectors')
  const view = selectMyPrivileges(createSeed(), 'priya', 'all')
  expect(view.counts).toEqual({ all: 17, overdue: 1, due: 1 })
  expect(view.rows[0]).toMatchObject({ agent: 'Duplicate Rx Agent', status: 'Review overdue · 7 days', action: 'Review' })
  expect(view.rows.find((r) => r.agent === 'Controlled Drug Agent')!.status).toBe('In 31 days · paused')
  expect(view.rows.find((r) => r.agent === 'Med Rec Agent')).toMatchObject({ status: 'In 59 days', signed: '06 Nov', due: '05 Feb' })
  expect(view.footer).toBe('Showing 17 of 17, soonest review first.')
  expect(view.overdue?.text).toBe('Duplicate Rx Agent passed its review date on 01 Dec. If you don’t review it by 15 Dec, flag duplicate therapy returns to Shadow and its flags stop reaching pharmacists. Marcus and Dana are copied.')
})

test('3c: the signature for PRV-0142 v3 on 06 Nov', async () => {
  const { selectSignature } = await import('./selectors')
  const view = selectSignature(buildScenario('awaiting-signature'), 'prv-0142')!
  expect(view.mode).toBe('sign')
  expect(view.title).toBe('Move admission med rec to Draft')
  expect(view.idLine).toBe('PRV-0142 · v3 draft')
  expect(view.review).toBe('05 Feb 2027 · in 91 days · a lapse sends the activity back to Shadow')
  expect(view.belowTarget).toBe('1 of 3 criteria is below target. A written reason is required and stays on the privilege record.')
  expect(view.records).toBe('Records: Priya · Director of Pharmacy · 2026-11-06 09:52 · PRV-0142 v3 · under ORG-SIGN-01')
  expect(selectSignature(createSeed(), 'prv-0142')!.mode).toBe('signed')
  expect(selectSignature(createSeed(), 'prv-0098')!.mode).toBe('renew')
  expect(selectSignature(createSeed(), 'nope')).toBeNull()
})

describe('review fix I1: the 3d notice says what the division’s policy does', () => {
  const text = (patch: Parameters<typeof applyDivisionSettings>[2]) =>
    selectMyPrivileges(applyDivisionSettings(createSeed(), 'medications', patch, 'dana', '2026-12-08T09:52:00'), 'priya', 'all').overdue?.text

  test('raise an exception only', () => {
    expect(text({ lapsePolicy: 'nothing' })).toBe('Duplicate Rx Agent passed its review date on 01 Dec. Flag duplicate therapy keeps its level until someone acts. Marcus and Dana are copied.')
  })
  test('pause the activity, after it acted', () => {
    expect(text({ lapsePolicy: 'pause' })).toBe('Duplicate Rx Agent passed its review date on 01 Dec. Flag duplicate therapy was paused on 08 Dec; pending work went to pharmacists. Marcus and Dana are copied.')
  })
  test('back to Shadow at once, after it acted', () => {
    expect(text({ lapsePolicy: 'shadowNow' })).toBe('Duplicate Rx Agent passed its review date on 01 Dec. Flag duplicate therapy returned to Shadow on 08 Dec; re-sign it to bring it back. Marcus and Dana are copied.')
  })
  test('a shorter grace period names its day and time', () => {
    expect(text({ graceDays: 7 })).toBe('Duplicate Rx Agent passed its review date on 01 Dec. If you don’t review it by 08 Dec 17:00, flag duplicate therapy returns to Shadow and its flags stop reaching pharmacists. Marcus and Dana are copied.')
  })
})

test('review fix I7: My privileges opens a privilege’s activity page; an overdue one still goes to signing', async () => {
  const { selectMyPrivileges } = await import('./selectors')
  const view = selectMyPrivileges(createSeed(), 'priya', 'all')
  const row = (agent: string) => view.rows.find((r) => r.agent === agent)!
  expect(row('Allergy Recon Agent').to).toBe('/portfolio/activities/allergy-recon')
  expect(row('Duplicate Rx Agent').to).toBe('/inventory/privileges/prv-0098/sign')
})
