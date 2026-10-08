import { createSeed, SEED_VERSION } from '../data/seed'
import { DEMO_NOW } from '../lib/clock'
import { createDemoStore, dataOf } from './index'
import { runAction } from './runAction'
import { createMemoryStorage, safeStorage } from './storage'

const fresh = () => createDemoStore(createMemoryStorage())

test('setPersona switches who you are', () => {
  const store = fresh()
  store.getState().setPersona('jordan')
  expect(store.getState().personaId).toBe('jordan')
})

test('reset restores the seed and Marcus', () => {
  const store = fresh()
  store.getState().setPersona('jordan')
  store.getState().claimException('exc-5530')
  store.getState().reset()
  expect(dataOf(store.getState())).toEqual(createSeed())
})

test('runAction applies the change and logs who, what and when', () => {
  const state = createSeed()
  const { state: next, result } = runAction(state, {
    action: 'resolveException',
    ctx: { divisionId: 'medications' },
    audit: { action: 'Claimed', target: 'EXC-5530' },
    mutate: (draft) => {
      draft.exceptions.find((e) => e.id === 'exc-5530')!.state = 'claimed'
    },
  })
  const byId = (s: typeof state) => s.exceptions.find((e) => e.id === 'exc-5530')!
  expect(result).toEqual({ ok: true })
  expect(next).not.toBe(state)
  expect(byId(next).state).toBe('claimed')
  expect(byId(state).state).toBe('new')
  expect(next.audit).toEqual([{ id: 'aud-1', at: DEMO_NOW, who: 'marcus', action: 'Claimed', target: 'EXC-5530' }])
})

test('Review focus 5: an action the persona may not take changes nothing', () => {
  const state = { ...createSeed(), personaId: 'jordan' as const }
  const mutate = vi.fn()
  const { state: next, result } = runAction(state, {
    action: 'resolveException',
    ctx: { divisionId: 'medications' },
    audit: { action: 'Claimed', target: 'EXC-5530' },
    mutate,
  })
  expect(result).toEqual({ ok: false, reason: 'Read-only access' })
  expect(next).toBe(state)
  expect(mutate).not.toHaveBeenCalled()
})

test('claimException claims as the current persona, and refuses read-only', () => {
  const store = fresh()
  expect(store.getState().claimException('exc-5530')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5530')!
  expect(exc).toMatchObject({ state: 'claimed', claimedAt: DEMO_NOW })

  const readOnly = fresh()
  readOnly.getState().setPersona('jordan')
  expect(readOnly.getState().claimException('exc-5530').ok).toBe(false)
  expect(readOnly.getState().exceptions.find((e) => e.id === 'exc-5530')!.state).toBe('new')
})

test('changes persist across store instances', () => {
  const storage = createMemoryStorage()
  createDemoStore(storage).getState().setPersona('priya')
  expect(createDemoStore(storage).getState().personaId).toBe('priya')
})

test('Review focus 1: saved state from an older seed version is discarded', () => {
  const storage = createMemoryStorage()
  storage.setItem(
    'acp-demo',
    JSON.stringify({ version: SEED_VERSION - 1, state: { personaId: 'jordan', agents: [{ id: 'old' }] } }),
  )
  const store = createDemoStore(storage)
  expect(dataOf(store.getState())).toEqual(createSeed())
})

test('Review focus 2: storage that throws falls back to memory', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  })
  try {
    safeStorage.setItem('probe', 'value')
    expect(safeStorage.getItem('probe')).toBe('value')
    const store = createDemoStore(safeStorage)
    store.getState().setPersona('sam')
    expect(store.getState().personaId).toBe('sam')
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('hydration rejects saved state that is not a full current snapshot (Review focus 1)', () => {
  const load = (raw: string) => {
    const storage = createMemoryStorage()
    storage.setItem('acp-demo', raw)
    return dataOf(createDemoStore(storage).getState())
  }
  const current = () => ({ ...createSeed(), personaId: 'priya' })

  test('corrupt JSON', () => {
    expect(load('{not json')).toEqual(createSeed())
  })
  test('a payload with no version', () => {
    expect(load(JSON.stringify({ state: { personaId: 'priya' } }))).toEqual(createSeed())
  })
  test('the current version but missing data', () => {
    expect(load(JSON.stringify({ version: SEED_VERSION, state: { version: SEED_VERSION, personaId: 'priya' } }))).toEqual(createSeed())
  })
  test('an unknown persona', () => {
    const bad = { ...current(), personaId: 'nobody' }
    expect(load(JSON.stringify({ version: SEED_VERSION, state: bad }))).toEqual(createSeed())
  })
  test('a valid snapshot is kept', () => {
    expect(load(JSON.stringify({ version: SEED_VERSION, state: current() })).personaId).toBe('priya')
  })
})

describe('claiming an exception', () => {
  test('cannot claim what is already claimed or resolved; nothing changes or is logged', () => {
    const store = fresh()
    const before = store.getState().exceptions.find((e) => e.id === 'exc-5501')!
    expect(store.getState().claimException('exc-5501')).toEqual({ ok: false, reason: 'Already claimed' })
    expect(store.getState().claimException('exc-5521')).toEqual({ ok: false, reason: 'Already resolved' })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5501')!.claimedAt).toBe(before.claimedAt)
    expect(store.getState().audit).toEqual([])
  })
  test('claiming makes you the owner', () => {
    const store = fresh()
    store.getState().setPersona('dana')
    expect(store.getState().claimException('exc-5530')).toEqual({ ok: true })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5530')!.ownerId).toBe('dana')
  })
})

test('snoozeException hides the item until the time and logs it; read-only is refused', () => {
  const store = fresh()
  expect(store.getState().snoozeException('exc-5512', '2026-12-08T10:52:00')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5512')!
  expect(exc.snoozedUntil).toBe('2026-12-08T10:52:00')
  expect(store.getState().audit.at(-1)).toMatchObject({ who: 'marcus', action: 'Snoozed', target: 'EXC-5512', reason: 'until 10:52' })

  const readOnly = fresh()
  readOnly.getState().setPersona('jordan')
  expect(readOnly.getState().snoozeException('exc-5512', '2026-12-08T10:52:00')).toMatchObject({ ok: false })
  expect(readOnly.getState().exceptions.find((e) => e.id === 'exc-5512')!.snoozedUntil).toBeUndefined()
})

test('snoozeException refuses resolved items and unknown ids', () => {
  const store = fresh()
  expect(store.getState().snoozeException('exc-5521', '2026-12-08T10:52:00')).toEqual({ ok: false, reason: 'Already resolved' })
  expect(store.getState().snoozeException('nope', '2026-12-08T10:52:00')).toEqual({ ok: false, reason: 'Not found' })
})

describe('dismissException', () => {
  const input = { category: 'expected' as const, reason: 'Formulary update F-112 explains it.' }

  test('an empty reason is refused and nothing changes', () => {
    const store = fresh()
    const before = dataOf(store.getState())
    expect(store.getState().dismissException('exc-5512', { ...input, reason: '   ' })).toEqual({ ok: false, reason: 'A reason is required' })
    expect(dataOf(store.getState())).toEqual(before)
  })

  test('a valid dismissal closes the item and logs the reason', () => {
    const store = fresh()
    expect(store.getState().dismissException('exc-5512', input)).toEqual({ ok: true })
    const exc = store.getState().exceptions.find((e) => e.id === 'exc-5512')!
    expect(exc).toMatchObject({ state: 'dismissed', dismissReason: 'Formulary update F-112 explains it.', closedAt: DEMO_NOW })
    expect(store.getState().audit.at(-1)).toMatchObject({
      who: 'marcus',
      action: 'Dismissed',
      target: 'EXC-5512',
      reason: 'Expected change · Formulary update F-112 explains it.',
    })
  })

  test('tuning the rule is logged on the agent for the technical owner to confirm', () => {
    const store = fresh()
    store.getState().dismissException('exc-5512', { ...input, tune: 'Raise the MR-12 threshold for Renal Dosing Agent to 20 % until 11 Dec' })
    expect(store.getState().logEvents.at(-1)).toMatchObject({
      at: DEMO_NOW,
      agentId: 'renal-dosing',
      text: 'Raise the MR-12 threshold for Renal Dosing Agent to 20 % until 11 Dec',
      sub: 'Requested by Marcus · Sam is asked to confirm',
    })
  })

  test('read-only is refused', () => {
    const store = fresh()
    store.getState().setPersona('jordan')
    expect(store.getState().dismissException('exc-5512', input)).toMatchObject({ ok: false })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5512')!.state).toBe('new')
  })
})

test('assignException hands the item to someone else, keeps the previous owner copied and logs it', () => {
  const store = fresh()
  store.getState().loadScenario('stale-escalated')
  store.getState().setPersona('priya')
  expect(store.getState().assignException('exc-5508', 'sam')).toEqual({ ok: true })
  const exc = store.getState().exceptions.find((e) => e.id === 'exc-5508')!
  expect(exc.ownerId).toBe('sam')
  expect(exc.assignedAt).toBe('2026-12-08T12:00:00')
  expect(exc.copied).toEqual(expect.arrayContaining(['marcus', 'priya']))
  expect(store.getState().audit.at(-1)).toMatchObject({ who: 'priya', action: 'Assigned', target: 'EXC-5508', reason: 'to Sam' })
})

describe('answerQuestion', () => {
  test('answering closes the question with the answer, logged', () => {
    const store = fresh()
    expect(store.getState().answerQuestion('exc-5514', 'yes')).toEqual({ ok: true })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5514')).toMatchObject({
      state: 'resolved',
      outcome: 'Answered yes',
      closedAt: DEMO_NOW,
      closedBy: 'marcus',
    })
    expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Answered', target: 'EXC-5514', reason: 'Yes' })
  })

  test('only questions take an answer; read-only is refused', () => {
    const store = fresh()
    expect(store.getState().answerQuestion('exc-5512', 'no')).toEqual({ ok: false, reason: 'Not a question' })
    store.getState().setPersona('jordan')
    expect(store.getState().answerQuestion('exc-5514', 'no')).toMatchObject({ ok: false })
    expect(store.getState().exceptions.find((e) => e.id === 'exc-5514')!.state).toBe('new')
  })
})

test('dismissing records who closed it', () => {
  const store = fresh()
  store.getState().dismissException('exc-5512', { category: 'expected', reason: 'F-112.' })
  expect(store.getState().exceptions.find((e) => e.id === 'exc-5512')!.closedBy).toBe('marcus')
})

test('assignException as read-only or frontline changes nothing', () => {
  for (const persona of ['jordan', 'ana'] as const) {
    const store = fresh()
    store.getState().loadScenario('stale-escalated')
    store.getState().setPersona(persona)
    const before = dataOf(store.getState())
    expect(store.getState().assignException('exc-5508', 'sam')).toMatchObject({ ok: false })
    expect(dataOf(store.getState())).toEqual(before)
  }
})

describe('pauseAgent (6b)', () => {
  test('Marcus pauses Med Rec: paused judgment, drafts routed, audited as Paused', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'agent', reason: 'HS-04 blocked 3 dose changes.' })).toEqual({ ok: true })
    const agent = store.getState().agents.find((a) => a.id === 'med-rec')!
    expect(agent).toMatchObject({ lifecycle: 'paused', pausedBy: 'marcus', pausedAt: DEMO_NOW, judgment: { status: 'paused', label: 'Paused by Marcus' } })
    expect(agent.pause).toMatchObject({ scope: 'agent', routed: 12, reason: 'HS-04 blocked 3 dose changes.', wasJudgment: { status: 'review' } })
    expect(store.getState().audit.at(-1)).toMatchObject({ who: 'marcus', action: 'Paused', target: 'AGT-0123', reason: 'HS-04 blocked 3 dose changes.' })
  })

  test('a second pause is refused and changes nothing; Jordan is refused', () => {
    const store = fresh()
    store.getState().pauseAgent('med-rec', { scope: 'agent' })
    const before = dataOf(store.getState())
    expect(store.getState().pauseAgent('med-rec', { scope: 'agent' })).toEqual({ ok: false, reason: 'Already paused' })
    expect(dataOf(store.getState())).toEqual(before)
    const ro = fresh()
    ro.getState().setPersona('jordan')
    expect(ro.getState().pauseAgent('med-rec', { scope: 'agent' })).toMatchObject({ ok: false })
    expect(ro.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('live')
  })

  test('this activity only: the activity pauses, the agent keeps running', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'activity' })).toEqual({ ok: true })
    expect(store.getState().agents.find((a) => a.id === 'med-rec')!.lifecycle).toBe('live')
    expect(store.getState().activities.find((a) => a.id === 'med-rec-admission')!.paused).toBe(true)
  })

  test('every agent in Medications: the 19 not already paused, one audit entry', () => {
    const store = fresh()
    expect(store.getState().pauseAgent('med-rec', { scope: 'division' })).toEqual({ ok: true })
    const meds = store.getState().agents.filter((a) => a.divisionId === 'medications' && a.lifecycle !== 'retired')
    expect(meds.every((a) => a.lifecycle === 'paused')).toBe(true)
    expect(meds.filter((a) => a.pause?.scope === 'division')).toHaveLength(19)
    expect(store.getState().audit.filter((a) => a.action === 'Paused')).toHaveLength(1)
  })
})
