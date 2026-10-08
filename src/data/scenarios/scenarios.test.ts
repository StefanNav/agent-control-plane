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

test('onboarding-intake (1a, 2a): 01 Oct, REQ-0093 approved and not started; Med Rec doesn’t exist yet', async () => {
  const { selectInventory } = await import('../../features/inventory/selectors')
  const s = buildScenario('onboarding-intake')
  expect(s.now).toBe('2026-10-01T09:05:00')
  expect(s.agents.find((a) => a.id === 'med-rec')).toBeUndefined()
  for (const items of [s.activities, s.privileges, s.grants, s.hardStops, s.instructions, s.onboardings, s.scorecards, s.sampleCases])
    expect((items as Array<{ agentId?: string }>).filter((i) => i.agentId === 'med-rec')).toEqual([])
  expect(s.intakeRequests.find((r) => r.id === 'req-0093')!.startedAt).toBeUndefined()
  expect(selectInventory(s).counts).toMatchObject({ agents: 40, drafts: 0, intake: 1 })
})

test('onboarding-at-5-of-7 (1b, 1i): Marcus left the job description at 5 of 7 on 03 Oct 16:42', async () => {
  const { stepStates, recordItems, jobFields } = await import('../../store/onboardingRules')
  const { selectInventory } = await import('../../features/inventory/selectors')
  const s = buildScenario('onboarding-at-5-of-7')
  expect(s.now).toBe('2026-10-04T08:41:00')
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  expect(record).toMatchObject({ version: 4, savedAt: '2026-10-03T16:42:00', startedAt: '2026-10-01T09:12:00' })
  expect(jobFields(s, 'med-rec').filter((f) => f.done)).toHaveLength(5)
  expect(record.limits.map((l) => l.code)).toEqual(['HS-04', 'HS-07', 'HS-11'])
  expect(recordItems(s, 'med-rec')).toEqual({ done: 6, total: 13 })
  expect(stepStates(s, 'med-rec').map((st) => st.sub)).toEqual([
    'Dana · done 01 Oct',
    'Marcus · 5 of 7',
    'Marcus · not started',
    'Sam · 0 of 3',
    'Priya · opens when 2–4 are done',
    'AIMS Review',
  ])
  expect(selectInventory(s).drafts).toEqual([
    expect.objectContaining({ name: 'Med Rec Agent', request: 'REQ-0093', step: '2 · Job description', stepSub: 'Escalation triggers, inaccuracy target', waitingOnId: 'marcus', progress: '6 of 13', lastChange: '03 Oct 16:42', field: 'escalation' }),
  ])
})

test('onboarding-systems (1c): 05 Oct 11:09, systems 3 of 4 while Teams · write has no activity', async () => {
  const { systemsProgress } = await import('../../store/onboardingRules')
  const s = buildScenario('onboarding-systems')
  expect(s.now).toBe('2026-10-05T11:09:00')
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  expect(record.version).toBe(6)
  expect(record.done.job?.at).toBe('2026-10-04T09:05:00')
  expect(systemsProgress(s, 'med-rec')).toMatchObject({ done: 3, total: 4, complete: false })
})

test('onboarding-tools-tested (1d): 06 Oct 14:21, all three hard stops tested, v0.9, ready to send', async () => {
  const { stepStates, readyToSend } = await import('../../store/onboardingRules')
  const s = buildScenario('onboarding-tools-tested')
  expect(s.now).toBe('2026-10-06T14:21:00')
  const record = s.onboardings.find((r) => r.agentId === 'med-rec')!
  expect(record.version).toBe(9)
  expect(record.limits.map((l) => [l.code, l.test?.blocked, l.test?.at])).toEqual([
    ['HS-04', 7, '2026-10-06T14:20:00'],
    ['HS-07', 2, '2026-10-06T14:20:00'],
    ['HS-11', 0, '2026-10-06T14:21:00'],
  ])
  expect(readyToSend(s, 'med-rec')).toBe(true)
  expect(stepStates(s, 'med-rec').slice(3, 5).map((st) => st.sub)).toEqual(['Sam · 3 of 3 tested', 'Priya · opens when you send'])
  expect(s.exceptions.filter((e) => e.agentId === 'med-rec' && e.state === 'new').map((e) => [e.type, e.ownerId])).toEqual([['Tools: hard stops to test', 'sam']])
})

test('onboarding-sponsor-review (1e, 1f) and onboarding-returned-hs11 (1g)', async () => {
  const { stepStates } = await import('../../store/onboardingRules')
  const review = buildScenario('onboarding-sponsor-review')
  expect(review.now).toBe('2026-10-07T09:05:00')
  expect(review.onboardings.find((r) => r.agentId === 'med-rec')!.sponsor).toMatchObject({ state: 'waiting', sentAt: '2026-10-06T15:10:00', sentBy: 'sam', round: 1 })
  expect(stepStates(review, 'med-rec').slice(3, 5).map((s) => s.sub)).toEqual(['Sam · done 06 Oct', 'Priya · waiting since 06 Oct'])

  const returned = buildScenario('onboarding-returned-hs11')
  expect(returned.now).toBe('2026-10-07T09:31:00')
  const record = returned.onboardings.find((r) => r.agentId === 'med-rec')!
  expect(record.savedAt).toBe('2026-10-07T09:31:00')
  expect(record.sponsor.returned).toMatchObject({ to: 'sam', about: 'HS-11', at: '2026-10-07T09:14:00' })
  expect(stepStates(returned, 'med-rec').slice(3, 5).map((s) => s.sub)).toEqual(['Sam · returned 07 Oct', 'Priya · reset, opens when you send'])
})
