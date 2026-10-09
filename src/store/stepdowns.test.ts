import { createSeed } from '../data/seed'
import { applySignPrivilege, latestByCode } from './onboarding'
import { applyThresholdStepDown, LOWER, openStepDown } from './stepdowns'

const AT = '2026-12-09T06:00:00'
const INPUT = { trigger: 'Edit rate above 15% for 3 days', routed: 18 }

test('a threshold breach drops the activity one level, by rule, at the gateway (15a, R12)', () => {
  const s = createSeed()
  applyThresholdStepDown(s, 'med-rec-admission', INPUT, AT)
  expect(s.activities.find((a) => a.id === 'med-rec-admission')!.level).toBe('shadow')
  expect(s.privileges.find((p) => p.code === 'PRV-0142' && p.version === 3)!.state).toBe('closed')
  expect(latestByCode(s, 'PRV-0142')).toMatchObject({ version: 4, level: 'shadow', state: 'steppedDown', movedBy: 'PRV-0142 v3', trigger: 'Edit rate above 15% for 3 days' })
  const agent = s.agents.find((a) => a.id === 'med-rec')!
  expect(agent.level).toBe('shadow')
  expect(agent.judgment).toEqual({ status: 'warn', label: 'Stepped down automatically' })
  const step = openStepDown(s, 'med-rec-admission')!
  expect(step).toMatchObject({ cause: 'threshold', from: 'draft', to: 'shadow', at: AT, fired: 'PRV-0142 v3', written: 'PRV-0142 v4', routed: 18, told: ['marcus', 'priya', 'dana'] })
  const item = s.exceptions.find((e) => e.id === step.exceptionId)!
  expect(item).toMatchObject({ status: 'warn', type: 'Stepped down', ownerId: 'marcus', copied: ['priya', 'dana'], raisedAt: '2026-12-09T06:01:00', agentId: 'med-rec' })
  expect(item.detail!.trend!.slice(-3)).toEqual([16.8, 17.9, 18.4])
})

test('one level at a time: firing the same step-down twice changes nothing more; Shadow has nowhere lower', () => {
  const s = createSeed()
  applyThresholdStepDown(s, 'med-rec-admission', INPUT, AT)
  const once = structuredClone(s)
  applyThresholdStepDown(s, 'med-rec-admission', INPUT, '2026-12-10T06:00:00')
  expect(s).toEqual(once)
  expect(LOWER.shadow).toBeNull()
  expect(LOWER.supervised).toBe('draft')
})

test('nothing steps back up by itself: signing a new version of PRV-0142 ends the step-down (3c)', () => {
  const s = createSeed()
  applyThresholdStepDown(s, 'med-rec-admission', INPUT, AT)
  const v4 = latestByCode(s, 'PRV-0142')!
  Object.assign(v4, { state: 'awaiting', proposedLevel: 'draft' })
  applySignPrivilege(s, 'PRV-0142', {}, 'priya', '2026-12-18T10:00:00')
  expect(s.activities.find((a) => a.id === 'med-rec-admission')!.level).toBe('draft')
  expect(openStepDown(s, 'med-rec-admission')).toBeUndefined()
  expect(s.stepDowns[0]).toMatchObject({ restoredAt: '2026-12-18T10:00:00', restoredBy: 'priya' })
  expect(s.agents.find((a) => a.id === 'med-rec')!.judgment).toEqual({ status: 'normal', label: 'Within scope' })
})
