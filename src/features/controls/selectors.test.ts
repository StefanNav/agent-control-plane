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
