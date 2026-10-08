import { buildScenario } from '../data/scenarios'
import { advanceClock } from '../data/scenarios/clock'
import { createSeed } from '../data/seed'
import { V150 } from '../data/seed/catalogue'
import { applyAccept, applyDeploy, applyHardStopApproval, applyReplay, applySystemsSignOff } from './changes'
import { applyFlag } from './feedback'
import { createDemoStore, dataOf } from './index'
import { createMemoryStorage } from './storage'

const DEPLOY = '2026-12-15T09:12:00'
function deployed() {
  const s = createSeed()
  applyFlag(s, { draftId: 'DR-88412', reason: 'frequency' }, 'ana', '2026-12-08T09:52:00')
  advanceClock(s, DEPLOY)
  return applyDeploy(s, V150, DEPLOY, 'sam')
}

test('deploy holds v1.5.0 with its four changes, the open frequency flags, and tells Marcus, Priya and Dana (9a)', () => {
  const s = deployed()
  const c = s.changes[0]!
  expect(c).toMatchObject({ id: 'chg-med-rec-v1-5-0', agentId: 'med-rec', status: 'held', deployedAt: DEPLOY, deployedBy: 'sam', deadline: '2026-12-22T09:12:00' })
  expect(c.items.map((i) => [i.item, i.live, i.held, i.needs])).toEqual([
    ['Agent build', 'v1.3.0', 'v1.5.0', 'replay'],
    ['SOP', 'SOP v1.3.1', 'SOP v1.5', 'replay'],
    ['Hard stop', 'HS-04 v2', 'HS-04 v3', 'hardStop'],
    ['Systems', 'Epic read', 'Adds Epic sig read', 'systems'],
  ])
  expect(c.fixes).toEqual(['fb-2283', 'fb-2284', 'fb-2287', 'fb-2289', 'fb-2290', 'fb-2291'])
  expect(c.hardStop!.removed).toBe(s.hardStops.find((h) => h.agentId === 'med-rec' && h.code === 'HS-04')!.text)
  expect(c.restarted).toEqual(['med-rec-allergy'])
  expect(s.scorecards.find((x) => x.activityId === 'med-rec-allergy')!.restartedOn).toEqual({ build: 'v1.5.0', at: DEPLOY })
  expect(c.timeline.map((t) => [t.at, t.title])).toEqual([
    [DEPLOY, 'v1.5.0 deployed'],
    [DEPLOY, 'Held at the gateway'],
    ['2026-12-15T09:13:00', 'Told Marcus, Priya, Dana'],
  ])
  const marcus = s.exceptions.find((e) => e.type === 'Re-validation needed')!
  expect(marcus).toMatchObject({ ownerId: 'marcus', copied: ['priya', 'dana'], state: 'new', link: { label: 'Open changes', to: '/operations/agents/med-rec?tab=changes' } })
  expect(c.timeline[2]!.sub).toBe(marcus.code)
  expect(s.exceptions.find((e) => e.type === 'Review: HS-04 v3')).toMatchObject({ ownerId: 'priya', state: 'new' })
})

test('after the three checks, accepting puts Med Rec on v1.5.0, HS-04 on v3, and fixes the flags', () => {
  let s = deployed()
  s = applyReplay(s, 'chg-med-rec-v1-5-0', 'marcus', '2026-12-15T10:20:00')
  s = applySystemsSignOff(s, 'chg-med-rec-v1-5-0', 'marcus', '2026-12-15T10:25:00')
  s = applyHardStopApproval(s, 'chg-med-rec-v1-5-0', 'priya', '2026-12-15T14:05:00')
  expect(s.exceptions.find((e) => e.type === 'Review: HS-04 v3')!.state).toBe('resolved')
  s = applyAccept(s, 'chg-med-rec-v1-5-0', 'marcus', '2026-12-16T08:30:00')
  expect(s.agents.find((a) => a.id === 'med-rec')).toMatchObject({ version: 'v1.5.0', sop: 'v1.5' })
  expect(s.hardStops.find((h) => h.agentId === 'med-rec' && h.code === 'HS-04')).toMatchObject({ version: 3, approvedBy: 'priya' })
  expect(s.hardStops.find((h) => h.agentId === 'med-rec' && h.code === 'HS-04')!.text).toMatch(/or a frequency/)
  expect(s.grants.find((g) => g.agentId === 'med-rec' && g.system === 'Epic')!.detail).toBe('Encounter, home med list, allergies, structured sig')
  expect(s.flags.filter((f) => f.status === 'fixed').map((f) => f.code)).toEqual(['FB-2283', 'FB-2284', 'FB-2287', 'FB-2289', 'FB-2290', 'FB-2291'])
  expect(s.flags.find((f) => f.code === 'FB-2291')).toMatchObject({ fixedIn: 'v1.5.0', fixedAt: '2026-12-16T08:30:00' })
  expect(s.changes[0]).toMatchObject({ status: 'accepted', closedBy: 'marcus' })
  // Med Rec's own review (3 drafts held) isn't the re-validation's to clear.
  expect(s.agents.find((a) => a.id === 'med-rec')!.judgment.label).toBe('Review: 3 drafts')
  expect(s.exceptions.find((e) => e.type === 'Re-validation needed')!.state).toBe('resolved')
})

test('a held build is withdrawn once its 7 days pass; an accepted one stays accepted (Review focus 2)', () => {
  const held = advanceClock(deployed(), '2026-12-22T09:13:00')
  expect(held.changes[0]!.status).toBe('withdrawn')
  expect(held.exceptions.filter((e) => e.type === 'Re-validation needed' || e.type === 'Review: HS-04 v3').every((e) => e.state === 'resolved')).toBe(true)
  expect(held.agents.find((a) => a.id === 'med-rec')!.version).toBe('v1.3.0')

  let s = deployed()
  s = applyReplay(s, 'chg-med-rec-v1-5-0', 'marcus', DEPLOY)
  s = applySystemsSignOff(s, 'chg-med-rec-v1-5-0', 'marcus', DEPLOY)
  s = applyHardStopApproval(s, 'chg-med-rec-v1-5-0', 'priya', DEPLOY)
  s = applyAccept(s, 'chg-med-rec-v1-5-0', 'marcus', DEPLOY)
  expect(advanceClock(s, '2026-12-23T09:52:00').changes[0]!.status).toBe('accepted')
})

describe('re-validation through the store', () => {
  const fresh = () => {
    const store = createDemoStore(createMemoryStorage())
    store.getState().loadScenario('change-detected-v150')
    return store
  }

  test('each check belongs to its person; accept waits for all three', () => {
    const store = fresh()
    store.getState().setPersona('marcus')
    expect(store.getState().acceptChange('chg-med-rec-v1-5-0')).toEqual({
      ok: false,
      reason: 'Waiting for: Replay matches or beats v1.3.0 · Marcus, Approve HS-04 v3 · Priya, Sign off Epic sig read · Marcus',
    })
    const before = dataOf(store.getState())
    expect(store.getState().approveChangeHardStop('chg-med-rec-v1-5-0').ok).toBe(false)
    expect(dataOf(store.getState())).toEqual(before)
    expect(store.getState().startReplay('chg-med-rec-v1-5-0')).toEqual({ ok: true })
    expect(store.getState().changes[0]!.replay.result!.lines[0]).toBe('Replayed 2,104 cases on v1.5.0')
    expect(store.getState().startReplay('chg-med-rec-v1-5-0')).toEqual({ ok: false, reason: 'Already done' })
    expect(store.getState().signOffSystems('chg-med-rec-v1-5-0')).toEqual({ ok: true })
    expect(store.getState().acceptChange('chg-med-rec-v1-5-0')).toEqual({ ok: false, reason: 'Waiting for: Approve HS-04 v3 · Priya' })
    store.getState().setPersona('priya')
    expect(store.getState().startReplay('chg-med-rec-v1-5-0').ok).toBe(false)
    expect(store.getState().approveChangeHardStop('chg-med-rec-v1-5-0')).toEqual({ ok: true })
    store.getState().setPersona('marcus')
    expect(store.getState().acceptChange('chg-med-rec-v1-5-0')).toEqual({ ok: true })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Accepted build', target: 'AGT-0123 v1.5.0' })
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!.judgment).toEqual({ status: 'normal', label: 'Within scope' })
    expect(store.getState().signOffSystems('chg-med-rec-v1-5-0')).toEqual({ ok: false, reason: 'v1.5.0 is no longer held' })
  })
})

test('change-detected-v150 (9a): 15 Dec 09:52, v1.5.0 held, Duplicate Rx lapsed, Ana’s flag answered, last week’s items handled', () => {
  const s = buildScenario('change-detected-v150')
  expect(s.now).toBe('2026-12-15T09:52:00')
  expect(s.changes).toHaveLength(1)
  expect(s.changes[0]!.status).toBe('held')
  expect(s.privileges.filter((p) => p.code === 'PRV-0098').at(-1)!.state).toBe('lapsed')
  expect(s.flags.find((f) => f.code === 'FB-2291')).toMatchObject({ status: 'inProgress', note: 'Frequency split into two lines' })
  expect(s.agents.find((a) => a.id === 'med-rec')!.monitor.lastSeen).toBe('2026-12-15T09:51:00')
  // The week between is settled: 08 Dec's items were handled; what stays open belongs to 15 Dec (or is an incident or the lapse).
  const open = s.exceptions.filter((e) => e.state !== 'resolved' && e.state !== 'dismissed' && e.type !== 'Unregistered caller')
  expect(open.map((e) => e.type).sort()).toEqual(['Re-validation needed', 'Review overdue', 'Review: HS-04 v3', 'Wrong-patient draft'])
  // Handled agents read "Within scope" again and stale feeds came back; Med Rec waits on re-validation.
  expect(s.agents.find((a) => a.id === 'med-rec')!.judgment).toEqual({ status: 'review', label: 'Re-validation needed' })
  expect(s.agents.find((a) => a.id === 'renal-dosing')!.judgment).toEqual({ status: 'normal', label: 'Within scope' })
  expect(s.agents.find((a) => a.id === 'formulary-swap')).toMatchObject({ judgment: { status: 'normal', label: 'Within scope' }, monitor: { lastSeen: '2026-12-15T09:51:00' } })
  expect(s.agents.find((a) => a.id === 'duplicate-rx')!.judgment.status).toBe('warn')
})
