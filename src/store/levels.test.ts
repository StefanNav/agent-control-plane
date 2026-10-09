import { createSeed } from '../data/seed'
import { createDemoStore, dataOf } from './index'
import { applyNewVersionLevels, levelOf, ruleRows } from './levels'
import { createMemoryStorage } from './storage'

const fresh = (persona: 'marcus' | 'priya' | 'dana' | 'jordan' = 'marcus') => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona(persona)
  return store
}

test('13a: Allergy Recon’s four rules, as written, and what each is doing now', () => {
  const s = createSeed()
  expect(ruleRows(s, 'allergy-recon')).toEqual([
    { id: 'reduce', move: 'Normal → Reduced', text: '30 days in a row with no defects, at least 300 checks, and an edit rate under 5 %', now: 'fired', at: '2026-11-24T06:00:00', counts: '312 checks · 0 defects' },
    { id: 'restore', move: 'Reduced → Normal', text: 'Any defect in a check, an edit rate above 5 % for 2 days, or a new agent or SOP version', now: 'watching', counts: '84 checks · 0 defects' },
    { id: 'tighten', move: 'Normal → Tightened', text: '2 defects in any 5 batches of checks in a row', now: 'off' },
    { id: 'relax', move: 'Tightened → Normal', text: '5 clean batches in a row', now: 'off' },
  ])
})

test('an activity with no rules of its own reads Normal with the template, written by its sponsor', () => {
  const record = levelOf(createSeed(), 'med-rec-admission')
  expect(record).toMatchObject({ activityId: 'med-rec-admission', writtenBy: 'priya', writtenAt: '2026-11-06T09:52:00', changes: [], checks: 0, defects: 0 })
  expect(ruleRows(createSeed(), 'med-rec-admission').map((r) => r.now)).toEqual(['watching', 'off', 'watching', 'off'])
})

test('Marcus tightens by hand, with a reason; Priya and Marcus are told; tightening twice is refused', () => {
  const store = fresh('marcus')
  expect(store.getState().tightenReviewLevel('allergy-recon', '')).toEqual({ ok: false, reason: 'Write a reason' })
  expect(store.getState().tightenReviewLevel('allergy-recon', 'Two near misses on 8 East this morning')).toEqual({ ok: true })
  const s = store.getState()
  expect(s.activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('tightened')
  expect(levelOf(s, 'allergy-recon').changes.at(-1)).toEqual({ at: s.now, from: 'reduced', to: 'tightened', by: 'marcus', why: 'Two near misses on 8 East this morning' })
  expect(s.logEvents.at(-1)).toMatchObject({ agentId: 'allergy-recon', text: 'Reconcile allergy lists: Reduced → Tightened', to: ['priya', 'marcus'] })
  const before = dataOf(store.getState())
  expect(store.getState().tightenReviewLevel('allergy-recon', 'Again')).toEqual({ ok: false, reason: 'Already at Tightened' })
  expect(dataOf(store.getState())).toEqual(before)
})

test('Jordan can’t tighten; Marcus can’t edit the rules; Priya can (13a)', () => {
  const jordan = fresh('jordan')
  const before = dataOf(jordan.getState())
  expect(jordan.getState().tightenReviewLevel('allergy-recon', 'Reason').ok).toBe(false)
  expect(dataOf(jordan.getState())).toEqual(before)

  const rules = { ...levelOf(createSeed(), 'allergy-recon').rules, reduce: { days: 30, checks: 400, editRate: 5 } }
  const marcus = fresh('marcus')
  expect(marcus.getState().updateReviewRules('allergy-recon', rules, 'More checks first')).toEqual({ ok: false, reason: 'Clinical sponsor only' })

  const priya = fresh('priya')
  expect(priya.getState().updateReviewRules('allergy-recon', rules, '')).toEqual({ ok: false, reason: 'Write a reason' })
  expect(priya.getState().updateReviewRules('allergy-recon', { ...rules, relax: { batches: 0 } }, 'Zero')).toEqual({ ok: false, reason: 'Every number must be at least 1' })
  expect(priya.getState().updateReviewRules('allergy-recon', rules, 'More checks before sampling drops')).toEqual({ ok: true })
  const s = priya.getState()
  expect(ruleRows(s, 'allergy-recon')[0]!.text).toBe('30 days in a row with no defects, at least 400 checks, and an edit rate under 5 %')
  expect(levelOf(s, 'allergy-recon')).toMatchObject({ writtenBy: 'priya', writtenAt: s.now })
})

test('a new agent or SOP version moves Reduced back to Normal, once (13a rule)', () => {
  const s = createSeed()
  applyNewVersionLevels(s, 'allergy-recon', '2026-12-08T10:00:00')
  expect(s.activities.find((a) => a.id === 'allergy-recon')!.reviewLevel).toBe('normal')
  expect(levelOf(s, 'allergy-recon').changes.at(-1)).toEqual({ at: '2026-12-08T10:00:00', from: 'reduced', to: 'normal', by: 'rule', why: 'New agent or SOP version' })
  const changes = levelOf(s, 'allergy-recon').changes.length
  applyNewVersionLevels(s, 'allergy-recon', '2026-12-08T11:00:00')
  expect(levelOf(s, 'allergy-recon').changes).toHaveLength(changes)
})

test('accepting a held build is a new version: a Reduced activity goes back to Normal (9a with 13a)', async () => {
  const { applyAccept, applyDeploy, applyHardStopApproval, applyReplay, applySystemsSignOff, changeId } = await import('./changes')
  const { V150 } = await import('../data/seed/catalogue')
  const s = createSeed()
  s.activities.find((a) => a.id === 'med-rec-admission')!.reviewLevel = 'reduced'
  applyDeploy(s, V150, '2026-12-08T10:00:00', 'sam')
  const id = changeId('med-rec', V150.build)
  applyReplay(s, id, 'marcus', '2026-12-08T10:10:00')
  applySystemsSignOff(s, id, 'marcus', '2026-12-08T10:15:00')
  applyHardStopApproval(s, id, 'priya', '2026-12-08T10:20:00')
  applyAccept(s, id, 'marcus', '2026-12-08T10:30:00')
  expect(s.activities.find((a) => a.id === 'med-rec-admission')!.reviewLevel).toBe('normal')
  expect(levelOf(s, 'med-rec-admission').changes.at(-1)).toMatchObject({ by: 'rule', why: 'New agent or SOP version' })
})
