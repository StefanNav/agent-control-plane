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

describe('15b: a new version steps the promoted branch down, one level, until the sponsor signs again', () => {
  const promoted = async () => {
    const { buildScenario } = await import('../data/scenarios')
    const { applyDecidePromotion, c4 } = await import('./promotions')
    const s = buildScenario('promotion-at-board')
    applyDecidePromotion(s, 'prm-0007', { kind: 'approveWithConditions', conditions: [c4('2026-12-09T15:20:00')], reason: 'Good evidence.' }, 'drlee', '2026-12-09T15:20:00')
    return s
  }

  test('deploying v1.3.0 drops outside-records Supervised → Draft and writes PRV-0087 v7; the activity stays at Draft', async () => {
    const { applyVersionDeploy } = await import('./stepdowns')
    const s = await promoted()
    applyVersionDeploy(s, 'allergy-recon', { build: 'v1.3.0', by: 'sam' }, '2026-12-14T14:20:00')
    const activity = s.activities.find((a) => a.id === 'allergy-recon')!
    expect(activity.branches.find((b) => b.id === 'outside-records')!.level).toBe('draft')
    expect(activity.level).toBe('draft')
    expect(activity.reviewLevel).toBe('normal')
    expect(s.agents.find((a) => a.id === 'allergy-recon')!.version).toBe('v1.3.0')
    expect(s.privileges.find((p) => p.code === 'PRV-0087' && p.version === 6)!.state).toBe('closed')
    expect(latestByCode(s, 'PRV-0087')).toMatchObject({ version: 7, state: 'steppedDown', movedBy: 'PRV-0087 v6', trigger: 'Any new agent or SOP version', branchLevels: { 'outside-records': 'draft' } })
    const step = openStepDown(s, 'allergy-recon', 'outside-records')!
    expect(step).toMatchObject({ cause: 'version', from: 'supervised', to: 'draft', build: { from: 'v1.2.0', to: 'v1.3.0', by: 'sam' }, revalidation: { replayed: 1412, cases: 2104, doneAt: '2026-12-14T15:32:00', meets: true } })
    expect(s.exceptions.find((e) => e.type === 'Review: restore Supervised')).toMatchObject({ ownerId: 'priya', link: { to: '/portfolio/activities/allergy-recon/branches/outside-records' } })
    const once = structuredClone(s)
    applyVersionDeploy(s, 'allergy-recon', { build: 'v1.3.0', by: 'sam' }, '2026-12-14T14:30:00')
    expect(s).toEqual(once)
  })

  test('a version change never drops Draft or Shadow: Med Rec’s new build steps nothing down', async () => {
    const { applyVersionDeploy } = await import('./stepdowns')
    const s = createSeed()
    applyVersionDeploy(s, 'med-rec', { build: 'v1.3.2', by: 'sam' }, '2026-12-08T10:00:00')
    expect(s.activities.filter((a) => a.agentId === 'med-rec').map((a) => a.level)).toEqual(['draft', 'shadow'])
    expect(s.stepDowns).toEqual([])
  })

  test('restoring is locked until the replay finishes; then the sponsor’s signature writes v8 at Supervised (BR-07)', async () => {
    const { createDemoStore, dataOf } = await import('./index')
    const { createMemoryStorage } = await import('./storage')
    const { advanceClock } = await import('../data/scenarios/clock')
    const store = createDemoStore(createMemoryStorage())
    store.getState().loadScenario('step-down-version')
    store.getState().setPersona('priya')
    const id = store.getState().stepDowns[0]!.id
    expect(store.getState().restoreLevel(id)).toEqual({ ok: false, reason: 'Opens when the replay finishes' })
    store.setState(advanceClock(structuredClone(dataOf(store.getState())), '2026-12-14T15:40:00'))
    store.getState().setPersona('marcus')
    expect(store.getState().restoreLevel(id)).toEqual({ ok: false, reason: 'Clinical sponsor only' })
    store.getState().setPersona('priya')
    expect(store.getState().restoreLevel(id)).toEqual({ ok: true })
    const s = store.getState()
    expect(latestByCode(s, 'PRV-0087')).toMatchObject({ version: 8, state: 'active', grantedBy: 'priya', branchLevels: { 'outside-records': 'supervised' } })
    expect(s.activities.find((a) => a.id === 'allergy-recon')!.branches[0]!.level).toBe('supervised')
    expect(store.getState().restoreLevel(id)).toEqual({ ok: false, reason: 'Already restored' })
  })
})
