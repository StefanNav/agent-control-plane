import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { applyAccept, applyHardStopApproval, applyReplay, applySystemsSignOff } from '../../store/changes'
import { selectChanges } from './selectors'

const ID = 'chg-med-rec-v1-5-0'

test('9a as Marcus: what changed, the SOP and hard-stop diffs, the three checks and their effects', () => {
  const view = selectChanges(buildScenario('change-detected-v150'), 'med-rec', 'marcus')!
  expect(view.tabLabel).toBe('Changes · 4')
  expect(view.header).toEqual({ status: 'v1.5.0 held at the gateway', idLine: 'v1.3.0 live · AGT-0123', chip: 'Re-validation needed' })
  expect(view.notice).toEqual({ lead: 'v1.5.0 is held at the gateway.', text: 'Sam deployed it at 09:12 today. Live traffic stays on v1.3.0 until you re-validate, so nothing from v1.5.0 reaches pharmacists before then.' })
  expect(view.tableHead).toBe('What changed · v1.3.0 → v1.5.0')
  expect(view.columns).toEqual(['Item', 'v1.3.0 · live', 'v1.5.0 · held', 'Needs'])
  expect(view.rows.map((r) => [r.item, r.live, r.liveSub, r.held, r.heldSub, r.needs])).toEqual([
    ['Agent build', 'v1.3.0', 'built 12 Oct', 'v1.5.0', 'built 14 Dec by Sam', 'Replay · Marcus'],
    ['SOP', 'SOP v1.3.1', 'signed 05 Nov', 'SOP v1.5', '2 sections changed', 'Replay · Marcus'],
    ['Hard stop', 'HS-04 v2', 'Never change a dose', 'HS-04 v3', 'adds frequency', 'Approval · Priya'],
    ['Systems', 'Epic read', 'encounter, home med list, allergies', 'Adds Epic sig read', 'structured frequency and timing', 'Sign-off · Marcus'],
  ])
  expect(view.sop).toMatchObject({ head: 'SOP v1.3.1 → v1.5', count: '2 sections' })
  expect(view.sop.sections.map((x) => x.section)).toEqual(['§3.2', '§5.1'])
  expect(view.hardStop).toMatchObject({ code: 'HS-04', title: 'Never change a dose', chip: 'Waiting for Priya', from: 'v2', to: 'v3' })
  expect(view.hardStop!.foot).toBe('Enforced at the gateway · owner Sam · approver Priya · would have blocked 0 of the last 2,104 cases')
  expect(view.revalidate).toMatchObject({ title: 'Re-validate v1.5.0', sub: 'Replay the last 30 days on v1.5.0 and compare every result with v1.3.0.', cases: '2,104', estimate: 'about 40 min' })
  expect(view.checks.map((c) => [c.label, c.who, c.done, c.action])).toEqual([
    ['Replay matches or beats v1.3.0', 'Marcus', false, null],
    ['Approve HS-04 v3', 'Priya', false, null],
    ['Sign off Epic sig read', 'Marcus', false, 'Sign off'],
  ])
  expect(view.canReplay).toBe(true)
  expect(view.accept).toEqual({ allowed: false, reason: 'Waiting for: Replay matches or beats v1.3.0 · Marcus, Approve HS-04 v3 · Priya, Sign off Epic sig read · Marcus' })
  expect(view.withdraw).toEqual({ lead: 'Withdrawn after 7 days.', text: 'If v1.5.0 isn’t accepted by 22 Dec, it’s removed and v1.3.0 keeps running.' })
  expect(view.effects).toEqual([
    ['Reconcile home medications at admission', 'Draft · stays on v1.3.0'],
    ['Flag allergy conflicts', 'Shadow · scorecard restarts on v1.5.0'],
  ])
  expect(view.release).toEqual({ head: 'Sam’s release note', text: 'Fixes the frequency split pharmacists have flagged since the Epic upgrade.', flag: 'FB-2291', more: 'and 5 more flags from 7 West and 8 East' })
  expect(view.timeline).toEqual([
    { at: '09:12', title: 'v1.5.0 deployed', sub: 'Build fingerprint differs from registered v1.3.0' },
    { at: '09:12', title: 'Held at the gateway', sub: 'Traffic stays on v1.3.0' },
    { at: '09:13', title: 'Told Marcus, Priya, Dana', sub: view.timeline[2]!.sub },
  ])
  expect(view.timeline[2]!.sub).toMatch(/^EXC-\d{4}$/)
})

test('Priya sees her approval as a button; after acceptance the tab reads "Changes" with the outcome', () => {
  let s = buildScenario('change-detected-v150')
  expect(selectChanges(s, 'med-rec', 'priya')!.checks[1]!.action).toBe('Approve')
  s = applyReplay(s, ID, 'marcus', '2026-12-15T10:20:00')
  s = applySystemsSignOff(s, ID, 'marcus', '2026-12-15T10:25:00')
  s = applyHardStopApproval(s, ID, 'priya', '2026-12-15T14:05:00')
  const before = selectChanges(s, 'med-rec', 'marcus')!
  expect(before.checks.map((c) => [c.done, c.doneLine])).toEqual([
    [true, 'Marcus · 15 Dec 10:20'],
    [true, 'Priya · 15 Dec 14:05'],
    [true, 'Marcus · 15 Dec 10:25'],
  ])
  expect(before.hardStop!.chip).toBe('Approved · Priya')
  expect(before.replayResult).toEqual(['Replayed 2,104 cases on v1.5.0', 'Agreement 92.6 % (v1.3.0: 91.2 %)', 'Frequency mismatches 0 (v1.3.0: 31)'])
  expect(before.accept).toEqual({ allowed: true, reason: null })
  s = applyAccept(s, ID, 'marcus', '2026-12-16T08:30:00')
  const after = selectChanges(s, 'med-rec', 'marcus')!
  expect(after.tabLabel).toBe('Changes')
  expect(after.header).toBeNull()
  expect(after.notice).toEqual({ lead: 'v1.5.0 accepted by Marcus on 16 Dec 08:30.', text: 'Every activity runs v1.5.0.' })
})

test('an agent with no change has no Changes tab', () => {
  expect(selectChanges(createSeed(), 'med-rec', 'marcus')).toBeNull()
})
