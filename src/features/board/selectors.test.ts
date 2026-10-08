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

test('exceptions first (4f): critical first then by deadline; next deadline shows who it goes to', async () => {
  const { selectOpenExceptions, selectLast24h } = await import('./selectors')
  const rows = selectOpenExceptions(s)
  expect(rows.map((r) => [r.type, r.deadline])).toEqual([
    ['Wrong-patient draft', 'Incident open'],
    ['Monitor stale', '10:46 → Priya'],
    ['Review: 3 drafts', '11:00'],
    ['Edit rate rising', '15:00'],
    ['Review overdue', '15 Dec'],
  ])
  expect(rows[0]).toMatchObject({ agent: 'Prior Auth Agent', division: 'Revenue cycle', owner: 'Tom', age: '1 h 47' })
  expect(selectLast24h(s)).toEqual({ pages: '1 · Tom, 08:05', pauses: '2', closed: '6 · median 41 min' })
})

test('wall (4e): attention cards with three items each, the rest overflow; pauses this hour count', async () => {
  const { selectWall } = await import('./selectors')
  const wall = selectWall(s)
  expect(wall.title).toBe('2 divisions need a human')
  expect(wall.attention.map((d) => [d.name, d.chip, d.sub])).toEqual([
    ['Revenue cycle', 'Critical', 'Tom · acknowledged 08:06'],
    ['Medications', '4 need a human', 'Marcus · next deadline 10:46'],
  ])
  expect(wall.attention[1]!.items.map((i) => `${i.name} ${i.reason} ${i.age}`)).toEqual([
    'Formulary Swap no data for 3 h 3 h 06',
    'Med Rec 3 drafts held by HS-04 10 min',
    'Renal Dosing edit rate 19.2 % 2 h 37',
  ])
  expect(wall.overflow).toEqual(['+1 more in Medications: Duplicate Rx Agent privilege review overdue'])
  expect(wall.lastHour).toBe('3 hard stops fired · 1 pause · 0 pages')
  const paused = { ...s, audit: [...s.audit, { id: 'a-x', at: '2026-12-08T09:40:00', who: 'marcus' as const, action: 'Paused', target: 'Renal Dosing Agent' }] }
  expect(selectWall(paused).lastHour).toBe('3 hard stops fired · 2 pauses · 0 pages')
})

test('a paused agent withdraws its numbers, like a stale one (plan 3.4)', () => {
  const rows = selectAgentRows(buildScenario('med-rec-paused'), 'medications')
  expect(rows.find((r) => r.id === 'med-rec')).toMatchObject({ status: 'paused', day: '—', signedAsIs: '—', edited: '—', blocked: '—' })
})

test('retired agents leave every board count (Phase 4)', async () => {
  const { onBoard } = await import('./selectors')
  const summaries = selectDivisionSummaries(s)
  expect(summaries.reduce((n, d) => n + d.agentCount, 0)).toBe(41)
  expect(summaries.find((d) => d.id === 'medications')!.agentCount).toBe(20)
  expect(selectAgentRows(s, 'medications')).toHaveLength(20)
  expect(s.agents.filter(onBoard)).toHaveLength(41)
  expect(s.agents.filter((a) => !onBoard(a)).every((a) => a.lifecycle === 'retired')).toBe(true)
})

test('a paused agent view reads like 6d: since when, why, and what happened to the work', () => {
  const v = selectAgentOverview(buildScenario('med-rec-paused'), 'med-rec')!
  expect(v.levelLine).toBe('Paused · since 09:47')
  expect(v.paused).toMatchObject({
    lead: 'Paused by Marcus at 09:47.',
    text: '12 drafts went to pharmacists. New admissions on 7 West and 8 East are reconciled by hand until both of you approve a resume.',
    whilePaused: { routed: '12 at 09:47', pausedFor: '5 min', incident: null },
  })
  expect(v.activities[0]!.level).toBe('Paused · was Draft')
})

test('a disabled agent withdraws its numbers too', async () => {
  const { createDemoStore } = await import('../../store')
  const { createMemoryStorage } = await import('../../store/storage')
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona('dana')
  store.getState().disableAgent('renal-dosing', 'Vendor review.')
  expect(selectAgentRows(store.getState(), 'medications').find((r) => r.id === 'renal-dosing')).toMatchObject({ day: '—', signedAsIs: '—', edited: '—', blocked: '—' })
})
