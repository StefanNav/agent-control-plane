import { createSeed } from '../../data/seed'
import { createDemoStore } from '../../store'
import { createMemoryStorage } from '../../store/storage'
import { selectSampling } from './selectors'

test('13b: Marcus’s queue, today’s six draws by activity, the first to check selected', () => {
  const view = selectSampling(createSeed(), 'marcus', 'today', null)
  expect(view.breadcrumb).toBe('Operations / Sampling queue')
  expect(view.title).toBe('Sampling queue')
  expect(view.status).toBe('Marcus · 3 activities on Reduced review')
  expect(view.tabs.map((t) => t.label)).toEqual(['Today · 6', 'Checked this week · 31', 'Rules'])
  expect(view.head).toBe('6 drawn · 4 to check')
  expect(view.groups.map((g) => [g.title, g.sub, g.rows.map((r) => [r.title, r.sub, r.time, r.checked])])).toEqual([
    ['Reconcile allergy lists', 'Allergy Recon Agent · Reduced · 1 in 50', [
      ['ACT-90412 · enc 7731', 'signed by Lee T., PharmD', '08:14', false],
      ['ACT-90377 · enc 7702', 'signed by Ana R., PharmD', '07:41', false],
      ['ACT-90330 · enc 7688', 'signed by Jo K., PharmD', '07:02', true],
    ]],
    ['Flag duplicate therapy', 'Duplicate Rx Agent · Reduced · 1 in 50', [
      ['ACT-90398 · enc 7719', 'signed by Ana R., PharmD', '07:55', false],
      ['ACT-90351 · enc 7695', 'signed by Lee T., PharmD', '07:20', true],
    ]],
    ['Reconcile vaccine history', 'Vaccine History Agent · Reduced · 1 in 50', [['ACT-90365 · enc 7698', 'signed by Jo K., PharmD', '07:33', false]]],
  ])
  const d = view.detail!
  expect(d.id).toBe('draw-act-90412')
  expect(d.meta).toBe('ACT-90412 · Allergy Recon Agent v1.2.0 · signed as is 08:14')
  expect(d.title).toBe('Encounter 7731 · 8 East · allergy list')
  expect(d.lines[2]).toEqual({ output: 'Add: sulfa · reaction unknown', outputSub: 'From an outside record', source: 'St. Mary’s summary, 2019', chart: 'Sulfonamide antibiotics' })
  expect(d.independent).toBe('Your check, independent of Lee T.')
  expect(d.notice).toEqual({ lead: 'One defect moves reconcile allergy lists back to Normal review.', text: 'Your result counts toward its rules as soon as you record it.' })
  expect(d.foot).toBe('Drawn at random · 1 in 50 · not chosen by anyone')
  expect(d.canRecord).toBe(true)
})

test('recording falls “to check” and raises “checked this week”; a defect drops one Reduced activity', () => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().recordCheck('draw-act-90412', { result: 'defect' })
  const view = selectSampling(store.getState(), 'marcus', 'today', null)
  expect(view.head).toBe('6 drawn · 3 to check')
  expect(view.tabs[1]!.label).toBe('Checked this week · 32')
  expect(view.status).toBe('Marcus · 2 activities on Reduced review')
  expect(view.detail!.id).toBe('draw-act-90377')
})

test('Priya sees the queue read only; the Rules tab lists the Reduced activities and signed unit changes', () => {
  const view = selectSampling(createSeed(), 'priya', 'rules', null)
  expect(view.detail!.canRecord).toBe(false)
  expect(view.rules.map((r) => [r.activity, r.level, r.to])).toEqual([
    ['Reconcile allergy lists', 'Reduced · 1 in 50', '/portfolio/activities/allergy-recon'],
    ['Flag duplicate therapy', 'Reduced · 1 in 50', '/portfolio/activities/duplicate-rx'],
    ['Reconcile vaccine history', 'Reduced · 1 in 50', '/portfolio/activities/vaccine-history'],
  ])
  expect(view.units).toEqual([])
})
