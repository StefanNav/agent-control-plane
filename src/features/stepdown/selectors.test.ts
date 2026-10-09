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
