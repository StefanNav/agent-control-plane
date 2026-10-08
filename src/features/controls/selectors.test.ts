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
