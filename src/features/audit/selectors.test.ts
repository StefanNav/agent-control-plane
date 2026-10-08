import { createSeed } from '../../data/seed'
import { buildScenario } from '../../data/scenarios'
import { selectActions, selectIncident, selectIncidents, selectTrace } from './selectors'

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

test('7c: INC-0031 at 11:58 reads like the record', () => {
  const inc = selectIncident(buildScenario('resume-requested'), 'marcus', 'inc-0031')!
  expect(inc).toMatchObject({
    code: 'INC-0031',
    title: 'Dose changes proposed on admission drafts',
    statusLine: 'Corrections · opened 10:05',
    chip: { status: 'warn', label: 'Open · 1 correction left' },
    rootCauseBy: 'Sam',
  })
  expect(inc.people).toEqual([
    { role: 'Commander', name: 'Marcus' },
    { role: 'Opened by', name: 'Jordan' },
    { role: 'Sponsor', name: 'Priya' },
    { role: 'Technical', name: 'Sam' },
    { role: 'Harm', name: 'None reached a patient' },
  ])
  expect(inc.summary).toMatch(/HS-04 v2 blocked all 3; pharmacists kept the home doses\. The agent has been paused for 2 h 11 min\.$/)
  expect(inc.linked.map((r) => r.code)).toEqual(['ACT-88213', 'ACT-88199', 'ACT-88171'])
  expect(inc.corrections.map((c) => [c.owner, c.status, c.done])).toEqual([
    ['Sam', 'Deployed 11:52', true],
    ['Marcus', 'HS-04 fired 0', true],
    ['Sam', 'Reviewed', true],
    ['Marcus', 'Due 15 Dec', false],
  ])
  expect(inc.close).toEqual({ lead: '1 correction open.', text: 'Marcus closes the incident when it’s done; Priya is told.', allowed: false })
  expect(inc.timeline.at(-1)).toEqual({ at: '11:58', title: 'Resume requested', sub: 'Marcus' })
})

test('the incidents list puts open ones first; unknown ids are null', () => {
  expect(selectIncidents(createSeed()).map((r) => [r.code, r.state])).toEqual([
    ['INC-0029', 'Investigating'],
    ['INC-0030', 'Closed'],
  ])
  expect(selectIncident(createSeed(), 'marcus', 'nope')).toBeNull()
})
