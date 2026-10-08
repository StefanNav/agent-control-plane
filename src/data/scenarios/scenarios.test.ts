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

test('resume-requested (6d, 6e): at 11:58 Marcus has asked; Priya has not approved', () => {
  const s = buildScenario('resume-requested')
  expect(s.now).toBe('2026-12-08T11:58:00')
  const medRec = agent(s, 'med-rec')
  expect(medRec).toMatchObject({ lifecycle: 'paused', pausedBy: 'marcus', pausedAt: '2026-12-08T09:47:00' })
  expect(medRec.pause).toMatchObject({ scope: 'agent', routed: 12, wasJudgment: { status: 'review', label: 'Review: 3 drafts' } })
  expect(medRec.pause!.changes).toHaveLength(3)
  expect(s.resumeRequests).toHaveLength(1)
  expect(s.resumeRequests[0]).toMatchObject({ agentId: 'med-rec', requestedBy: 'marcus', requestedAt: '2026-12-08T11:58:00' })
  expect(s.resumeRequests[0]!.approvals.map((a) => a.personId)).toEqual(['marcus'])
  expect(s.resumeRequests[0]!.reason).toMatch(/^Dose mapping fixed in SOP v1\.3\.2/)
  const inc = s.incidents.find((i) => i.code === 'INC-0031')!
  expect(inc).toMatchObject({ openedBy: 'jordan', commanderId: 'marcus', state: 'corrections' })
  expect(inc.corrections.filter((c) => c.done)).toHaveLength(3)
  expect(inc.timeline.at(-1)).toMatchObject({ title: 'Resume requested' })
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

test('resume-requested keeps the rest of the hospital live at 11:58; the pause was 2 h 11 min earlier', async () => {
  const { formatAgo } = await import('../../lib/clock')
  const s = buildScenario('resume-requested')
  expect(formatAgo(agent(s, 'med-rec').pausedAt!, s.now)).toBe('2 h 11 min ago')
  expect(agent(s, 'renal-dosing').monitor.lastSeen).toBe('2026-12-08T11:57:00')
})

test('med-rec-paused (6b result): paused at 09:47 by Marcus with the 6b reason; 12 drafts routed', () => {
  const s = buildScenario('med-rec-paused')
  expect(agent(s, 'med-rec').pause).toMatchObject({ scope: 'agent', routed: 12, reason: 'HS-04 blocked 3 dose changes since 09:00. Pausing until we know why.' })
  expect(s.logEvents.some((e) => e.agentId === 'med-rec' && e.text === '12 drafts routed to pharmacists')).toBe(true)
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
