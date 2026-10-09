import { createSeed } from '../../data/seed'
import { selectActivityPage, selectReviewLevel } from './selectors'

test('13a header: the activity, its level and review level, the privilege in force (R2)', () => {
  const view = selectActivityPage(createSeed(), 'allergy-recon', null, 'priya')!
  expect(view.breadcrumb).toBe('Medications / Allergy Recon Agent / Privileges / PRV-0087')
  expect(view.title).toBe('Reconcile allergy lists')
  expect(view.status).toBe('Draft · review level Reduced')
  expect(view.idLine).toBe('PRV-0087 v5 · Allergy Recon Agent v1.2.0')
  expect(view.defaultTab).toBe('review-level')
  expect(view.tabs.map((t) => [t.id, t.label, t.to])).toEqual([
    ['privilege', 'Privilege', '/portfolio/activities/allergy-recon?tab=privilege'],
    ['review-level', 'Review level', '/portfolio/activities/allergy-recon'],
    ['evidence', 'Evidence', '/portfolio/activities/allergy-recon?tab=evidence'],
    ['history', 'History', '/portfolio/activities/allergy-recon?tab=history'],
  ])
})

test('unknown activities and branches have no page; a branch page defaults to History', () => {
  expect(selectActivityPage(createSeed(), 'nope', null, 'priya')).toBeNull()
  expect(selectActivityPage(createSeed(), 'allergy-recon', 'nope', 'priya')).toBeNull()
  const branch = selectActivityPage(createSeed(), 'allergy-recon', 'outside-records', 'priya')!
  expect(branch.title).toBe('Add an allergy from outside records')
  expect(branch.defaultTab).toBe('history')
})

test('13a: the level, its rules, the last 90 days and the side cards, counted from data (R3)', () => {
  const view = selectReviewLevel(createSeed(), 'allergy-recon')
  expect(view.levels.map((l) => [l.level, l.title, l.rate, l.since, l.current])).toEqual([
    ['tightened', 'Tightened', 'Every signed output checked', null, false],
    ['normal', 'Normal', '1 in 10 checked', null, false],
    ['reduced', 'Reduced', '1 in 50 checked', 'since 24 Nov', true],
  ])
  expect(view.help).toBe('Pharmacists still sign every output at Draft. The review level sets how many signed outputs a second pharmacist checks independently, to catch what the agent got wrong and the reviewer missed.')
  expect(view.rulesHead).toBe('Rules that move the level · written by Priya, 28 Sep')
  expect(view.rows.map((r) => [r.move, r.now, r.nowLabel, r.counts])).toEqual([
    ['Normal → Reduced', 'fired', 'Fired 24 Nov', '312 checks · 0 defects'],
    ['Reduced → Normal', 'watching', 'Watching', '84 checks · 0 defects'],
    ['Normal → Tightened', 'off', 'Not in use', null],
    ['Tightened → Normal', 'off', 'Not in use', null],
  ])
  expect(view.bar.map((b) => [b.level, b.label, b.date])).toEqual([
    ['normal', 'Normal', '09 Sep'],
    ['tightened', 'Tightened', '06 Oct'],
    ['normal', 'Normal', '13 Oct'],
    ['reduced', 'Reduced', '24 Nov'],
  ])
  expect(view.bar.reduce((sum, b) => sum + b.share, 0)).toBeCloseTo(1, 5)
  expect(view.at).toEqual({
    title: 'At Reduced',
    sub: 'About 7 checks a day of ~340 outputs',
    rows: [
      ['Checked by', 'Marcus · sampling queue'],
      ['Drawn', 'at random, 06:00 daily'],
      ['Since 24 Nov', '84 checks · 0 defects'],
      ['Back to Normal', 'on 1 defect'],
    ],
  })
  expect(view.changes).toEqual([
    { date: '24 Nov', title: 'Normal → Reduced', sub: 'Rule fired · 312 checks, 0 defects' },
    { date: '13 Oct', title: 'Tightened → Normal', sub: '5 clean batches' },
    { date: '06 Oct', title: 'Normal → Tightened', sub: '2 duplicate allergies with different spellings · fixed in SOP v1.2.1' },
  ])
  expect(view.told).toBe('Priya and Marcus are told each time')
})

test('review fix I5: the activity history shows a step-down as the rule that made it, not a signature', async () => {
  const { buildScenario } = await import('../../data/scenarios')
  const { historyRows } = await import('./selectors')
  const rows = historyRows(buildScenario('step-down-threshold'), 'med-rec-admission')
  expect(rows.map((r) => [r.date, r.title, r.sub])).toEqual([
    ['09 Dec 06:00', 'Stepped down to Shadow', 'By rule · Edit rate above 15% for 3 days'],
    ['06 Nov', 'Draft', 'Priya signed PRV-0142 v3'],
  ])
  expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length)
})
