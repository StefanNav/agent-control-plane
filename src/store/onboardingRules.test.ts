import { createSeed } from '../data/seed'
import type { DemoState } from '../data/types'
import { firstMissingField, jobFields, openStep, recordItems, stepStates, systemsProgress } from './onboardingRules'

/** Med Rec's record as 1b shows it: Marcus left it at 5 of 7 on 03 Oct 16:42. */
function atFiveOfSeven(): DemoState {
  const s = createSeed()
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  Object.assign(record, {
    version: 4,
    savedAt: '2026-10-03T16:42:00',
    frozenAt: undefined,
    grants: [],
    sponsor: { state: 'notSent', round: 0, earlier: [] },
    review: undefined,
    done: { intake: { at: '2026-10-01T09:12:00', by: 'dana' } },
  })
  record.job.escalation = []
  record.job.targets.inaccurate = null
  for (const limit of record.limits) {
    delete limit.test
    delete limit.previousTest
  }
  const agent = s.agents.find((a) => a.id === 'med-rec')!
  agent.lifecycle = 'onboarding'
  s.now = '2026-10-04T08:41:00'
  return s
}

test('1b: the job description is 5 of 7, with the inaccuracy target missing', () => {
  const s = atFiveOfSeven()
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  const fields = jobFields(s, 'med-rec')
  expect(fields.filter((f) => f.done)).toHaveLength(5)
  expect(fields.map((f) => f.label)).toEqual([
    'Purpose',
    'Activities · 2',
    'Never list · 4',
    'Acting for',
    'Escalation triggers',
    'Success criteria · 2 of 3 targets',
    'Rollout domain',
  ])
  expect(firstMissingField(s, 'med-rec')).toBe('escalation')
  expect(recordItems(s, 'med-rec')).toEqual({ done: 6, total: 13 })
  expect(record.version).toBe(4)
})

test('1b: the rail reads as drawn', () => {
  const s = atFiveOfSeven()
  expect(stepStates(s, 'med-rec').map((st) => st.sub)).toEqual([
    'Dana · done 01 Oct',
    'Marcus · 5 of 7',
    'Marcus · not started',
    'Sam · 0 of 3',
    'Priya · opens when 2–4 are done',
    'AIMS Review',
  ])
  expect(stepStates(s, 'med-rec').map((st) => st.mark)).toEqual(['done', 'todo', 'todo', 'todo', 'locked', 'none'])
  expect(openStep(s, 'med-rec')).toEqual({
    step: 'job',
    number: 2,
    name: 'Job description',
    missing: ['Escalation triggers', 'inaccuracy target'],
    waitingOn: 'marcus',
  })
})

test('1c: systems are 3 of 4 while Teams · write has no activity', () => {
  const s = createSeed()
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  record.grants.find((g) => g.system === 'Microsoft Teams' && g.verb === 'write')!.activity = null
  const progress = systemsProgress(s, 'med-rec')
  expect(progress.done).toBe(3)
  expect(progress.total).toBe(4)
  expect(progress.rows.map((r) => r.summary)).toEqual(['read, draft', 'read, write', 'read', 'choose activity'])
})

test('a completed record: every step done, 13 of 13, nothing open', () => {
  const s = createSeed()
  expect(stepStates(s, 'med-rec').map((st) => st.sub)).toEqual([
    'Dana · done 01 Oct',
    'Marcus · done 04 Oct',
    'Marcus · done 05 Oct',
    'Sam · done 07 Oct',
    'Priya · signed 07 Oct',
    'AIMS Review · since 07 Oct',
  ])
  expect(openStep(s, 'med-rec')).toBeNull()
})

test('before start: the intake waits on Dana and later steps say "after start"', () => {
  const s = createSeed()
  const intake = s.intakeRequests.find((r) => r.code === 'REQ-0106')!
  expect(stepStates(s, intake.agentId).map((st) => st.sub)).toEqual([
    'Dana · ready to start',
    'Marcus · after start',
    'Marcus · after start',
    'Sam · after start',
    'Priya',
    'AIMS Review',
  ])
  expect(recordItems(s, intake.agentId)).toEqual({ done: 0, total: 10 })
  expect(openStep(s, intake.agentId)).toMatchObject({ step: 'intake', waitingOn: 'dana' })
})
