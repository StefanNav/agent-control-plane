import { createSeed } from '../../data/seed'
import { selectActions, selectTrace } from './selectors'

const s = createSeed()

test('7a: today’s blocked Med Rec actions, newest first', () => {
  const list = selectActions(s, { agentId: 'med-rec', policy: 'blocked' })
  expect(list.summary).toBe('3 of 1,912 actions today')
  expect(list.rows.map((r) => r.code)).toEqual(['ACT-88213', 'ACT-88199', 'ACT-88171'])
  expect(list.rows[0]).toMatchObject({
    time: '09:38:02',
    what: 'Draft med list · enc 4417',
    version: 'v1.3.0 · SOP v1.3.1',
    actingFor: 'Ana R. · 7 West',
    rule: 'HS-04 v2',
    policy: 'blocked · 3 passed',
    reviewer: 'Edited 1 line, signed',
  })
})

test('7a unfiltered: the latest seeded actions against the day’s total', () => {
  const list = selectActions(s, {})
  expect(list.summary).toBe(`Latest ${list.rows.length} of 1,912 actions today`)
  expect(list.rows.find((r) => r.code === 'ACT-88207')).toMatchObject({ rule: null, policy: '4 passed' })
})

test('7b: the trace of ACT-88213 with who-and-what, policy decisions and links', () => {
  const t = selectTrace(s, 'act-88213')!
  expect(t.view.steps).toHaveLength(8)
  expect(t.sub).toBe('Med Rec Agent v1.3.0 · SOP v1.3.1 · acting for Ana R., PharmD · 7 West · 08 Dec')
  expect(t.who).toEqual([
    ['Agent', 'Med Rec Agent v1.3.0'],
    ['SOP', 'v1.3.1 · hash 7f3a·c210'],
    ['Acting for', 'Ana R., PharmD'],
    ['Privilege', 'PRV-0142 v3 · Draft'],
  ])
  expect(t.policy).toEqual({
    summary: '4 checked · 1 blocked',
    rows: [
      ['HS-11 v1', 'passed'],
      ['HS-04 v2', 'blocked'],
      ['HS-07 v1', 'passed'],
      ['C1 · pharmacist signs', 'passed'],
    ],
  })
  expect(t.linked).toEqual({ exception: { id: 'exc-5530', text: 'EXC-5530 · Marcus' }, sameRule: ['ACT-88171', 'ACT-88199'] })
})

test('Review focus 5: unknown ids are null; a trace-less action says so', () => {
  expect(selectTrace(s, 'nope')).toBeNull()
  expect(selectTrace(s, 'act-88240')!.view.steps).toEqual([])
})
