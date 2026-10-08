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

test('resume-requested keeps the demo clock; the pause was 2 h 14 min earlier', async () => {
  const { DEMO_NOW, formatAgo } = await import('../../lib/clock')
  const s = buildScenario('resume-requested')
  expect(s.now).toBe(DEMO_NOW)
  expect(formatAgo(agent(s, 'med-rec').pausedAt!, s.now)).toBe('2 h 14 min ago')
})

test('stale-escalated (5d): at 12:00 the unanswered stale monitor is escalated to Priya', async () => {
  const { selectInbox } = await import('../../features/inbox/selectors')
  const s = buildScenario('stale-escalated')
  expect(s.now).toBe('2026-12-08T12:00:00')
  expect(s.exceptions.find((e) => e.id === 'exc-5530')!.claimedAt).toBeDefined()
  expect(agent(s, 'med-rec').monitor.lastSeen).toBe('2026-12-08T11:59:00')
  expect(agent(s, 'formulary-swap').monitor.lastSeen).toBe('2026-12-08T06:41:00')
  const priya = selectInbox(s, 'priya')
  expect(priya.needsMe.map((i) => [i.id, i.escalated])).toEqual([
    ['exc-5508', true],
    ['exc-5503', false],
    ['exc-5497', false],
  ])
  expect(priya.needsMe[0]!.due).toBe('1 h 14 min late')
  expect(priya.waiting.map((i) => i.id)).toEqual(['exc-5512'])
})
