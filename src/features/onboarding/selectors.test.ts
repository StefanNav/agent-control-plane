import { buildScenario } from '../../data/scenarios'
import { selectIntakeStep, selectSpan } from './selectors'

const s = buildScenario('onboarding-intake')

test('2a: Marcus’s span counts from data — 22 activities with Med Rec, over the guideline of 7', () => {
  const span = selectSpan(s, 'marcus', 'med-rec')
  expect(span).toMatchObject({ name: 'Marcus', total: 22, guideline: 7, over: true })
  expect(span.rows).toHaveLength(6)
  expect(span.rows[0]).toEqual({ name: 'Discharge Meds Agent', activities: 2 })
  expect(span.rows.at(-1)).toEqual({ name: 'Med Rec Agent · new', activities: 2 })
  expect(span.more).toEqual({ agents: 14, activities: 14 })
})

test('2a: technical owner candidates, Medications first, counted from data', () => {
  expect(selectIntakeStep(s, 'med-rec')!.techOwners).toEqual([
    { id: 'sam', label: 'Sam · integration analyst', sub: 'Medications · technical owner on 19 agents' },
    { id: 'lena', label: 'Lena · integration analyst', sub: 'Discharge · technical owner on 8 agents' },
    { id: 'omar', label: 'Omar · clinical informatics analyst', sub: 'Revenue cycle · technical owner on 13 agents' },
  ])
})

test('1a: what carries over from REQ-0093, and what starting does', () => {
  const step = selectIntakeStep(s, 'med-rec')!
  expect(step.carried).toEqual([
    ['Name', 'Med Rec Agent'],
    ['Division', 'Medications'],
    ['Requested by', 'Priya · clinical sponsor'],
    ['Purpose', 'Prepare admission medication reconciliation drafts for pharmacist review, so pharmacists start from a complete home medication list.'],
    ['Rollout domain', '7 West, 8 East · adults 18+ · all hours'],
    ['Committee condition', '21-day shadow before any Draft privilege'],
  ])
  expect(step.conditionDate).toBe('29 Sep')
  expect(step.defaultOwner).toBe('marcus')
  expect(step.starting('marcus', 'sam')).toEqual([
    'Creates AGT-0123 as a draft in Inventory → Drafts',
    'Fills name, division, requester, purpose and domain from REQ-0093',
    'Asks Marcus for the job description, systems and verbs',
    'Asks Sam for tools and hard stops',
    'Tells Priya when 2 to 4 are done',
  ])
  expect(selectIntakeStep(s, 'nope')).toBeNull()
})

test('1b: Marcus is welcomed back at the first missing field; the side panel says what is blocked', async () => {
  const { selectJobStep } = await import('./selectors')
  const s5 = buildScenario('onboarding-at-5-of-7')
  const job = selectJobStep(s5, 'med-rec', 'marcus')!
  expect(job.welcome).toEqual({
    title: 'Welcome back, Marcus',
    text: 'You left this draft on 03 Oct at 16:42 with 5 of 7 fields done. It’s open at the first missing one, Escalation triggers.',
    saved: 'Autosaved 16:42 · v0.4',
  })
  expect(job.blocked).toEqual({ left: 7, next: [{ field: 'escalation', label: 'Escalation triggers' }, { field: 'criteria', label: 'inaccuracy target' }] })
  expect(job.alsoNeeded).toEqual(['Systems and verbs · Marcus', '3 hard stops · Sam'])
  expect(job.never.map((n) => n.becomes)).toEqual(['HS-04', 'HS-07', 'HS-11', 'ORG-POL-02'])
  expect(selectJobStep(s5, 'med-rec', 'sam')!.welcome).toBeNull()
})

test('1h: the signature, the round of changes, and what happens next', async () => {
  const { selectReviewStep } = await import('./selectors')
  const ready = buildScenario('onboarding-ready')
  const view = selectReviewStep(ready, 'med-rec')!
  expect(view.signature).toEqual([
    ['Signed by', 'Priya · clinical sponsor'],
    ['When', '07 Oct 2026 · 16:02'],
    ['Version', 'AGT-0123 v1.0'],
    ['Covers', 'Job, reach, 5 tools, 3 hard stops'],
  ])
  expect(view.rounds).toBe(
    'Signed after one round of changes: Priya asked for HS-11 to be re-tested on September’s 8 East transfers. Sam re-ran it: 0 of 212 would have been blocked. Both notes stay on the record.',
  )
  expect(view.next.map(([k]) => k)).toEqual(['Risk tier', 'Committee packet', 'The agent', 'Changes'])
  expect(view.next[1]![1]).toBe('Built from this record for Dr. Lee, the committee chair. Next meeting 14 Oct.')
  expect(view.side).toMatchObject({ title: 'Onboarding · 13 of 13', sub: 'Complete · 01 Oct to 07 Oct' })
  // The completed baseline record reads the same.
  expect(selectReviewStep(createBaseline(), 'med-rec')!.rounds).toBe(view.rounds)
})

function createBaseline() {
  return buildScenario('baseline')
}
