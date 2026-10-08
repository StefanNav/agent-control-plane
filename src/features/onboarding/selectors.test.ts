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
