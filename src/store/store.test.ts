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
