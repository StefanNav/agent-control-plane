import { createSeed } from '../../data/seed'
import { createDemoStore } from '../../store'
import { createMemoryStorage } from '../../store/storage'
import { selectAgentOverview, selectDivisionSummaries } from '../board/selectors'
import { selectInventory, selectRecord, selectRetirePreview } from './selectors'

const s = createSeed()

test('inventory tabs count from data: 41 agents, 1 draft, 2 intakes, 6 retired', () => {
  expect(selectInventory(s).counts).toEqual({ agents: 41, drafts: 1, intake: 2, retired: 6 })
  expect(selectInventory(s).agents).toHaveLength(41)
  const medRec = selectInventory(s).agents.find((r) => r.id === 'med-rec')!
  expect(medRec).toMatchObject({ name: 'Med Rec Agent', division: 'Medications', level: 'Draft', status: 'review', label: 'Review: 3 drafts', sponsor: 'Priya', tier: 'Tier 3', review: '05 Feb' })
  expect(selectInventory(s).retired.map((r) => r.code)).toEqual(['RET-06', 'RET-05', 'RET-04', 'RET-03', 'RET-02', 'RET-01'])
})

test('one record (8c): governance and operations', () => {
  expect(selectRecord(s, 'med-rec')).toMatchObject({
    name: 'Med Rec Agent',
    governance: [
      ['Record', 'AGT-0123 · v1.0'],
      ['Risk tier', 'Tier 3 · High'],
      ['Committee', 'Approved with C1–C3 · 14 Oct'],
      ['Privileges', '1 Draft · 1 Shadow'],
      ['Next review', '05 Feb 2027'],
    ],
    operations: { status: 'review', label: 'Review: 3 drafts', build: 'v1.3.0 · SOP v1.3.1', lastData: '09:51 · 1 min ago' },
  })
})

test('retiring IV-to-Oral (6f): what it does, from data', () => {
  expect(selectRetirePreview(s, 'iv-to-oral').lines).toEqual([
    'Revokes the agent’s gateway credentials; it has no tool grants',
    expect.stringMatching(/^Closes 1 privilege, PRV-\d+ \(Shadow\)$/),
    'Archives the record under RET-07; still searchable in audit and exports',
    'Moves it to Inventory → Retired; it leaves every board',
  ])
})

test('Review focus 3: a retired agent leaves every board and count, but its view still opens', () => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona('dana')
  store.getState().retireAgent('iv-to-oral', { typedName: 'IV-to-Oral Agent', reason: 'Replaced by order-set logic.' })
  const st = store.getState()
  const summaries = selectDivisionSummaries(st)
  expect(summaries.reduce((n, d) => n + d.agentCount, 0)).toBe(40)
  expect(summaries.find((d) => d.id === 'medications')!.agentCount).toBe(19)
  expect(selectInventory(st).counts).toMatchObject({ agents: 40, retired: 7 })
  expect(selectAgentOverview(st, 'iv-to-oral')).toMatchObject({ retired: { code: 'RET-07' } })
})

test('Important #5: a newly retired agent\'s header agrees with the Retired notice', () => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona('dana')
  store.getState().retireAgent('med-rec', { typedName: 'Med Rec Agent', reason: 'Replaced.' })
  expect(selectAgentOverview(store.getState(), 'med-rec')).toMatchObject({
    levelLine: 'Retired · RET-07 · 08 Dec',
    judgment: { status: 'normal', label: 'Retired' },
  })
})

test('Drafts (1i) are the records being onboarded: Culture Follow-up waits on Marcus at the job description', () => {
  expect(selectInventory(s).drafts).toEqual([
    {
      id: 'culture-followup',
      agentId: 'culture-followup',
      name: 'Culture Follow-up Agent',
      division: 'Medications',
      request: 'REQ-0099',
      step: '2 · Job description',
      stepSub: 'Never list, Acting for, Escalation triggers, Success criteria',
      waitingOn: 'Marcus',
      waitingOnId: 'marcus',
      progress: '4 of 10',
      items: { done: 4, total: 10 },
      lastChange: '07 Dec 15:30',
      field: 'never',
      stepId: 'job',
    },
  ])
})
