import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { monitorFreshness, selectAgentOverview, selectAgentPanel, selectAgentRows, selectDivisionSummaries, severityRank } from './selectors'

const s = createSeed()

test('severity: critical first, then anything needing a human, then normal, paused, shadow', () => {
  expect(severityRank('crit')).toBeLessThan(severityRank('warn'))
  expect(severityRank('warn')).toBe(severityRank('review'))
  expect(severityRank('stale')).toBe(severityRank('review'))
  expect(severityRank('review')).toBeLessThan(severityRank('normal'))
  expect(severityRank('normal')).toBeLessThan(severityRank('paused'))
  expect(severityRank('paused')).toBeLessThan(severityRank('shadow'))
})

test('the hospital board puts divisions needing a human first', () => {
  const divisions = selectDivisionSummaries(s)
  expect(divisions.map((d) => d.name)).toEqual(['Revenue cycle', 'Medications', 'Discharge', 'Imaging referrals', 'Patient messages'])
  const meds = divisions[1]!
  expect(meds).toMatchObject({ needsHuman: 4, counts: { warn: 2, review: 1, stale: 1 }, judgment: '4 agents need a human', breakdown: '2 warnings · 1 review · 1 stale' })
  expect(meds.attention.map((a) => [a.name, a.reason, a.age])).toEqual([
    ['Med Rec Agent', '3 drafts held by HS-04 v2', '10 min'],
    ['Renal Dosing Agent', 'edit rate 19.2 % against 10 %', '2 h 37'],
    ['Duplicate Rx Agent', 'privilege review 7 days overdue', '7 d'],
    ['Formulary Swap Agent', 'no data for 3 h', '3 h 06'],
  ])
  expect(meds.nextDeadline).toEqual({ at: '10:46', to: 'Priya' })
  expect(divisions[0]).toMatchObject({ judgment: 'Wrong-patient draft · paused', breakdown: '1 critical', status: 'crit' })
  expect(divisions[2]).toMatchObject({ judgment: 'Within scope', breakdown: 'None', status: 'normal' })
  expect(divisions[4]).toMatchObject({ judgment: 'Shadow · 3 agents', status: 'shadow' })
})

test('division rows follow the division view and withdraw stale metrics', () => {
  const rows = selectAgentRows(s, 'medications')
  expect(rows).toHaveLength(20)
  expect(rows[0]).toMatchObject({ name: 'Med Rec Agent', label: 'Review: 3 drafts', day: '138', signedAsIs: '89.6%', edited: '8.9%', blocked: '3', level: 'Draft', grantor: 'Priya', reviewDate: '05 Feb' })
  expect(rows.find((r) => r.name === 'Formulary Swap Agent')).toMatchObject({ day: '—', signedAsIs: '—', edited: '—', blocked: '—' })
  expect(rows.at(-1)!.status).toBe('shadow')
})

test('the agent panel shows activities, last 7 days and recent actions', () => {
  const panel = selectAgentPanel(s, 'discharge-meds')!
  expect(panel.activities.map((a) => a.name)).toEqual(['Draft discharge med list', 'Flag discharge interactions'])
  expect(panel.week).toEqual({ actions: '1,964', asIs: '94.8%', edited: '4.9%', rejected: '0.3%', blocked: '0' })
  expect(panel.recent.map((r) => r.at)).toEqual(['09:41:07', '09:36:52'])
})

test('the agent overview reads like 4c; unknown agents are null', () => {
  const view = selectAgentOverview(s, 'med-rec')!
  expect(view.banner).toMatchObject({ headline: '3 drafts held by HS-04 v2 need a pharmacist decision.', exceptionId: 'exc-5530' })
  expect(view.stats.map((st) => st.value)).toEqual(['96', '89.6 %', '8.9 %', '1.5 %', '3'])
  expect(view.activities.map((a) => a.level)).toEqual(['Draft', 'Shadow'])
  expect(view.recent.map((r) => r.code)).toEqual(['ACT-88240', 'ACT-88213', 'ACT-88207', 'ACT-88199', 'ACT-88188'])
  expect(view.monitoring).toMatchObject({ last: '09:51 · 1 min ago', gateway: 'gw-east-2 · healthy', freshness: 'live' })
  expect(selectAgentOverview(s, 'nope')).toBeNull()
})

test('monitor freshness: live, delayed past one interval, stale past three', () => {
  expect(monitorFreshness('2026-12-08T09:51:00', 5, '2026-12-08T09:52:00')).toBe('live')
  expect(monitorFreshness('2026-12-08T09:44:00', 5, '2026-12-08T09:52:00')).toBe('delayed')
  expect(monitorFreshness('2026-12-08T06:41:00', 5, '2026-12-08T09:52:00')).toBe('stale')
})

test('pausing an agent shows on its row', () => {
  const paused = buildScenario('med-rec-paused')
  expect(selectAgentRows(paused, 'medications').find((r) => r.name === 'Med Rec Agent')!.status).toBe('paused')
})
