import { createDemoStore } from '../../store'
import { createMemoryStorage } from '../../store/storage'
import { createSeed } from '../seed'
import { buildScenario } from './index'

const agent = (s: ReturnType<typeof createSeed>, id: string) => s.agents.find((a) => a.id === id)!

test('baseline is the seed', () => {
  expect(buildScenario('baseline')).toEqual(createSeed())
})

test('med-rec-paused: Marcus paused Med Rec Agent', () => {
  const s = buildScenario('med-rec-paused')
  expect(agent(s, 'med-rec')).toMatchObject({
    lifecycle: 'paused',
    pausedBy: 'marcus',
    judgment: { status: 'paused', label: 'Paused by Marcus' },
  })
})

test('resume-requested: Marcus asked, Priya has not approved', () => {
  const s = buildScenario('resume-requested')
  expect(agent(s, 'med-rec').lifecycle).toBe('paused')
  expect(s.resumeRequests).toHaveLength(1)
  expect(s.resumeRequests[0]).toMatchObject({ agentId: 'med-rec', requestedBy: 'marcus', approvals: [] })
  expect(s.resumeRequests[0]!.reason).toMatch(/^Wrong-patient root cause fixed in v1\.3\.1/)
})

test('awaiting-signature: PRV-0142 waits for Priya, Shadow → Draft', () => {
  const s = buildScenario('awaiting-signature')
  const prv = s.privileges.find((p) => p.code === 'PRV-0142')!
  expect(prv).toMatchObject({ state: 'awaiting', level: 'shadow', proposedLevel: 'draft' })
})

test('step-down-threshold: admission med rec dropped to Shadow by rule', () => {
  const s = buildScenario('step-down-threshold')
  expect(s.activities.find((a) => a.id === 'med-rec-admission')!.level).toBe('shadow')
  const prv = s.privileges.find((p) => p.activityId === 'med-rec-admission')!
  expect(prv.state).toBe('steppedDown')
  expect(prv.trigger).toBeTruthy()
})

test('scenarios do not share state', () => {
  const a = buildScenario('med-rec-paused')
  const b = buildScenario('baseline')
  expect(agent(b, 'med-rec').lifecycle).toBe('live')
  expect(a).not.toBe(b)
})

test('loading a scenario keeps the current persona', () => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona('priya')
  store.getState().loadScenario('med-rec-paused')
  expect(store.getState().personaId).toBe('priya')
  expect(store.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('paused')
})
