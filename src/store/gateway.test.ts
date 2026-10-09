import { createDemoStore, dataOf } from './index'
import { createMemoryStorage } from './storage'

const fresh = () => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona('dana')
  return store
}
const caller = (store: ReturnType<typeof fresh>, id: string) => store.getState().callers.find((c) => c.id === id)!
const item = (store: ReturnType<typeof fresh>, id: string) =>
  store.getState().exceptions.find((e) => e.type === 'Unregistered caller' && e.link?.to === `/inventory/unregistered/${id}`)!

test('Dana has one inbox item per unregistered caller (9b "flagged to Dana")', () => {
  const store = fresh()
  const items = store.getState().exceptions.filter((e) => e.type === 'Unregistered caller')
  expect(items.map((e) => [e.ownerId, e.state, e.link?.to])).toEqual([
    ['dana', 'new', '/inventory/unregistered/svc-dc-summary-bot'],
    ['dana', 'new', '/inventory/unregistered/ed-triage-helper'],
    ['dana', 'new', '/inventory/unregistered/rx-price-check'],
  ])
})

test('blocking needs a reason; a blocked caller stays listed and Dana’s item closes', () => {
  const store = fresh()
  expect(store.getState().blockCaller('svc-dc-summary-bot', ' ')).toEqual({ ok: false, reason: 'Give a reason. Every choice is logged with a reason.' })
  expect(store.getState().blockCaller('svc-dc-summary-bot', 'Notes leave Epic for a 46-member channel')).toEqual({ ok: true })
  expect(caller(store, 'svc-dc-summary-bot')).toMatchObject({ group: 'unregistered', decision: { kind: 'blocked', by: 'dana', reason: 'Notes leave Epic for a 46-member channel' } })
  expect(item(store, 'svc-dc-summary-bot').state).toBe('resolved')
  expect(store.getState().blockCaller('svc-dc-summary-bot', 'again')).toEqual({ ok: false, reason: 'Already decided' })
  expect(store.getState().audit.at(-1)).toMatchObject({ action: 'Blocked at the gateway', target: 'svc-dc-summary-bot' })
})

test('"Not an agent" moves the caller to Dismissed', () => {
  const store = fresh()
  expect(store.getState().dismissCaller('rx-price-check', 'Price lookups only, no patient data')).toEqual({ ok: true })
  expect(caller(store, 'rx-price-check')).toMatchObject({ group: 'dismissed', decision: { kind: 'notAgent' } })
  expect(store.getState().callers.filter((c) => c.group === 'dismissed')).toHaveLength(13)
})

test('starting onboarding from REQ-0081 registers the bot: it leaves Unregistered', () => {
  const store = fresh()
  expect(store.getState().startOnboarding('req-0081', { ownerId: 'elena', techOwnerId: 'lena' })).toEqual({ ok: true })
  expect(caller(store, 'svc-dc-summary-bot').decision).toMatchObject({ kind: 'onboarding', agentId: 'discharge-huddle', by: 'dana' })
  expect(item(store, 'svc-dc-summary-bot').state).toBe('resolved')
})

test('a message is logged; a caller with no known owner can’t be messaged; only Dana decides', () => {
  const store = fresh()
  expect(store.getState().messageCallerOwner('svc-dc-summary-bot', 'Can we talk about the 5 South summaries?')).toEqual({ ok: true })
  expect(caller(store, 'svc-dc-summary-bot').messages).toEqual([{ by: 'dana', text: 'Can we talk about the 5 South summaries?', at: '2026-12-08T09:52:00' }])
  expect(store.getState().messageCallerOwner('ed-triage-helper', 'Hello')).toEqual({ ok: false, reason: 'No owner to message' })
  store.getState().setPersona('marcus')
  const before = dataOf(store.getState())
  expect(store.getState().blockCaller('svc-dc-summary-bot', 'reason').ok).toBe(false)
  expect(store.getState().dismissCaller('svc-dc-summary-bot', 'reason').ok).toBe(false)
  expect(dataOf(store.getState())).toEqual(before)
})
