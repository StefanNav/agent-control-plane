import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { selectStepDown } from './selectors'

test('15a for Marcus: what happened at 06:00, how to get back to Draft, the ladder and the timeline', () => {
  const s = buildScenario('step-down-threshold')
  const view = selectStepDown(s, 'med-rec', 'marcus')!
  expect(view.levelLine).toBe('Reconcile home medications · Shadow since 06:00')
  expect(view.chip).toBe('Stepped down automatically')
  expect(view.notice).toEqual({
    lead: 'Reconcile home medications stepped down from Draft to Shadow at 06:00.',
    text: 'A trigger on PRV-0142 v3 fired: edit rate above 15 % for 3 days in a row. It was 16.8 %, 17.9 % and 18.4 %.',
  })
  expect(view.chart).toMatchObject({ label: 'Edit rate · 14 days', target: 15, highlight: 3, targetLabel: 'step-down threshold' })
  expect(view.chart!.days[0]).toBe('26 Nov')
  expect(view.happened.map((h) => [h.n, h.title, h.sub])).toEqual([
    ['18', 'drafts in progress went to pharmacists', '7 West and 8 East worklists, within a minute'],
    ['0', 'drafts reach pharmacists from now on', 'The agent keeps running in shadow and is compared with pharmacists’ lists'],
    ['3', 'people told', expect.stringMatching(/^You, Priya and Dana · exception EXC-\d{4} in your inbox$/)],
  ])
  expect(view.back.map((b) => [b.n, b.title, b.sub, b.who])).toEqual([
    [1, 'Find and fix the cause', 'Pharmacists are splitting frequency fields since the Epic upgrade on 05 Dec', 'Marcus, Sam'],
    [2, 'Shadow scorecard meets the same targets', 'At least 7 days on the fixed version', 'Evidence'],
    [3, 'Priya signs again', 'A new version of PRV-0142', 'Priya'],
  ])
  expect(view.ladder.map((l) => l.state)).toEqual(['current', 'held', 'available', 'locked'])
  expect(view.timeline.map((t) => [t.at, t.title, t.sub])).toEqual([
    ['07 Dec', 'Edit rate 16.8 %', 'Day 1 above 15 %'],
    ['08 Dec', 'Edit rate 17.9 %', 'Day 2 · Marcus warned'],
    ['09 Dec', 'Edit rate 18.4 %', 'Day 3 · trigger fired'],
    ['06:00', 'Stepped down to Shadow', 'At the gateway, by rule'],
    ['06:01', 'Told Marcus, Priya, Dana', expect.stringMatching(/^EXC-\d{4}$/)],
  ])
})

test('others read the names, and whose inbox it is in; no step-down, no 15a', () => {
  const view = selectStepDown(buildScenario('step-down-threshold'), 'med-rec', 'jordan')!
  expect(view.happened[2]!.sub).toMatch(/^Marcus, Priya and Dana · exception EXC-\d{4} in Marcus’s inbox$/)
  expect(selectStepDown(createSeed(), 'med-rec', 'marcus')).toBeNull()
})

test('15b: the branch stepped down when v1.3.0 was deployed; re-validation is running; restore is locked', async () => {
  const { selectBranchHistory } = await import('./selectors')
  const { selectActivityPage } = await import('../activity/selectors')
  const s = buildScenario('step-down-version')
  const page = selectActivityPage(s, 'allergy-recon', 'outside-records', 'priya')!
  expect(page.status).toBe('Draft since 14 Dec 14:20 · was Supervised')
  expect(page.idLine).toBe('PRV-0087 v7 · Allergy Recon Agent v1.3.0')
  const view = selectBranchHistory(s, 'allergy-recon', 'outside-records', 'priya')!
  expect(view.notice).toEqual({
    lead: 'Stepped down to Draft when Allergy Recon Agent v1.3.0 was deployed.',
    text: 'Any new agent or SOP version re-earns Supervised. Until then pharmacists sign each add again; nothing was lost.',
  })
  expect(view.revalidation).toMatchObject({
    head: 'Re-validation · replay of the last 30 days on v1.3.0',
    progress: '1,412 of 2,104 adds replayed',
    left: 'about 40 min left',
    stats: [
      { label: 'Same result as v1.2.0', value: '99.6 %' },
      { label: 'Different, and better', value: '0.3 %' },
      { label: 'Different, and worse', value: '0.1 % · 2 adds' },
    ],
  })
  expect(view.rows.map((r) => [r.date, r.title, r.sub, r.ladder.map((l) => l.state)])).toEqual([
    ['14 Dec 14:20', 'Stepped down to Draft', 'New agent version v1.3.0, deployed by Sam', ['passed', 'current', 'held', 'locked']],
    ['09 Dec', 'Promoted to Supervised', 'Board approved with C4 · Dr. Lee', ['passed', 'passed', 'current', 'locked']],
    ['08 Dec', 'Priya signed the promotion', 'Sent to the board', ['passed', 'current', 'proposed', 'locked']],
    ['09 Sep', 'Draft', 'Priya signed PRV-0087 v1', ['passed', 'current', 'available', 'locked']],
  ])
  expect(view.restore).toMatchObject({ label: 'Sign to restore Supervised', locked: 'Opens when the replay finishes' })
  expect(view.triggers.map((t) => [t.text, t.fired, t.to])).toEqual([
    ['Any new agent or SOP version', 'fired 14 Dec', 'to Draft'],
    ['Any defect in an independent check', null, 'to Draft'],
    ['Any linked incident', null, 'to Draft'],
    ['Rejections above 0.5 % for 3 days', null, 'to Draft'],
  ])
})
