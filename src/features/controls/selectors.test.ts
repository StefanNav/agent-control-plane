import { createSeed } from '../../data/seed'
import { selectPausePreview } from './selectors'

const s = createSeed()

test('6b impact preview for Med Rec as Marcus', () => {
  const p = selectPausePreview(s, 'marcus', 'med-rec', 'agent')
  expect(p.scopes.map((o) => [o.value, o.title, o.description])).toEqual([
    ['activity', 'This activity', 'Reconcile home medications at admission'],
    ['agent', 'This agent', 'Both activities'],
    ['division', 'Every agent in Medications', expect.stringMatching(/^20 agents · \d+ activities at Draft$/)],
  ])
  expect(p.effects.map((e) => [e.value, e.lead])).toEqual([
    ['12', 'drafts in progress go back to pharmacists'],
    ['4', 'drafts waiting for review stay'],
    ['~6', 'admissions an hour reconciled by hand'],
  ])
  expect(p.resumeRule).toEqual({ lead: 'Resuming needs Priya and you,', text: 'both with a reason. Each activity returns to the level it had.' })
  expect(p.audit).toBe('Logs Marcus · 09:52')
})

test('as someone who isn\'t owner or sponsor, the rule names both', () => {
  expect(selectPausePreview(s, 'dana', 'med-rec', 'agent').resumeRule.lead).toBe('Resuming needs Priya and Marcus,')
})

test('fix one thing (6c) for Med Rec as Sam', async () => {
  const { selectFixOneThing } = await import('./selectors')
  const f = selectFixOneThing(s, 'sam', 'med-rec')
  expect(f.description).toBe('Change one tool or one activity. The rest of Med Rec Agent keeps working.')
  expect(f.audit).toBe('Logs Sam · technical owner')
  expect(f.activities.map((o) => [o.value, o.title, o.description, o.disabled ?? false])).toEqual([
    ['med-rec-admission', 'Reconcile home medications at admission', 'Draft · signed by Priya · PRV-0142 v3', false],
    ['med-rec-allergy', 'Flag allergy conflicts', 'Already in Shadow', true],
  ])
  expect(f.shadowEffects).toEqual([
    'Drafts stop reaching pharmacists; 12 in progress go to the worklists.',
    'The agent keeps running in shadow, so evidence keeps coming.',
    'The scorecard restarts against the same targets.',
  ])
  expect(f.shadowRule('med-rec-admission')).toEqual({
    lead: 'Back to Draft needs Priya’s signature again.',
    text: 'PRV-0142 v3 closes; a new version is drafted for Priya to sign.',
  })
  expect(f.grants.map((g) => g.title)).toEqual(['Epic · read', 'Epic · draft', 'Pharmacy worklist · read', 'Pharmacy worklist · draft', 'Pharmacy worklist · write', 'Pyxis · read', 'Teams · write'])
})

describe('resume panel (6d, 6e)', async () => {
  const { buildScenario } = await import('../../data/scenarios')
  const { selectResumePanel } = await import('./selectors')
  const at1158 = buildScenario('resume-requested')

  test('Marcus waits (6d)', () => {
    const p = selectResumePanel(at1158, 'marcus', 'med-rec')!
    expect(p).toMatchObject({ mode: 'waiting', title: 'Request to resume', stamp: 'Requested 11:58', reasonLabel: 'Reason · Marcus', statusLine: 'Stays paused until Priya approves. Both of you see this request.' })
    expect(p.needs).toEqual([
      { who: 'Marcus · agent owner', status: 'requested 11:58', done: true, current: false },
      { who: 'Priya · clinical sponsor', status: 'approval pending · told 11:58', done: false, current: true },
    ])
    expect(p.returnsTo).toEqual([
      { activity: 'Reconcile home medications at admission', level: 'Draft', status: 'normal' },
      { activity: 'Flag allergy conflicts', level: 'Shadow', status: 'shadow' },
    ])
  })

  test('Priya decides (6e)', () => {
    const p = selectResumePanel(at1158, 'priya', 'med-rec')!
    expect(p).toMatchObject({ mode: 'approve', title: 'Marcus asks to resume Med Rec Agent', stamp: 'Requested 11:58 · paused 09:47', reasonLabel: 'Marcus’s reason' })
    expect(p.needs[1]).toMatchObject({ who: 'Priya · clinical sponsor', status: 'you · deciding now', current: true })
    expect(p.changes.map((c) => c.title)).toEqual(['SOP v1.3.1 → v1.3.2', 'Replay · 23 cases', 'Incident INC-0031'])
  })

  test('before any request, the owner sees the request form; others read only', () => {
    const paused = buildScenario('med-rec-paused')
    expect(selectResumePanel(paused, 'marcus', 'med-rec')).toMatchObject({ mode: 'request', title: 'Request to resume' })
    expect(selectResumePanel(paused, 'jordan', 'med-rec')).toMatchObject({ mode: 'readonly' })
    expect(selectResumePanel(createSeed(), 'marcus', 'med-rec')).toBeNull()
  })
})
