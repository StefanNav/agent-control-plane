import { REVIEWER_STATS } from '../data/seed/catalogue'
import { createDemoStore, dataOf } from './index'
import { readUnit } from './reviewers'
import { createMemoryStorage } from './storage'

const fresh = (persona: 'marcus' | 'priya' | 'dana' = 'marcus') => {
  const store = createDemoStore(createMemoryStorage())
  store.getState().setPersona(persona)
  return store
}

test('readUnit tells the five stories of 11a apart', () => {
  expect(REVIEWER_STATS.map((u) => [u.name, readUnit(u)])).toEqual([
    ['6 North', 'Reviewers checking less'],
    ['7 West', 'Agent drifting, reviewers catching it'],
    ['8 East', 'Agent drifting, reviewers catching it'],
    ['5 South', 'Agent improved'],
    ['ED observation', 'Steady'],
  ])
})

test('Marcus sends a sampling change; Priya signs it; it runs 14 days', () => {
  const store = fresh()
  expect(store.getState().proposeReviewChange('6-north', 'sampling')).toEqual({ ok: true })
  expect(store.getState().proposeReviewChange('6-north', 'tighten')).toEqual({ ok: false, reason: 'A change for 6 North is waiting for Priya' })
  const change = store.getState().reviewChanges.at(-1)!
  expect(change).toMatchObject({ unitId: '6-north', option: 'sampling', by: 'marcus', state: 'waiting' })
  const item = store.getState().exceptions.find((e) => e.type === 'Review: sampling change · 6 North')!
  expect(item).toMatchObject({ ownerId: 'priya', state: 'new', link: { to: '/operations/reviewers/6-north' } })
  expect(store.getState().signReviewChange(change.id).ok).toBe(false)
  store.getState().setPersona('priya')
  expect(store.getState().proposeReviewChange('7-west', 'sampling').ok).toBe(false)
  expect(store.getState().signReviewChange(change.id)).toEqual({ ok: true })
  expect(store.getState().reviewChanges.at(-1)).toMatchObject({ state: 'signed', decidedBy: 'priya', until: '2026-12-22T09:52:00' })
  expect(store.getState().exceptions.find((e) => e.id === item.id)!.state).toBe('resolved')
  expect(store.getState().signReviewChange(change.id)).toEqual({ ok: false, reason: 'Already decided' })
})

test('declining needs a reason; Jordan can’t propose; sharing logs an FYI to Priya', () => {
  const store = fresh()
  store.getState().proposeReviewChange('6-north', 'minTime')
  const id = store.getState().reviewChanges.at(-1)!.id
  store.getState().setPersona('priya')
  expect(store.getState().declineReviewChange(id, ' ')).toEqual({ ok: false, reason: 'Say why' })
  expect(store.getState().declineReviewChange(id, 'Timers get gamed; raise sampling instead')).toEqual({ ok: true })
  expect(store.getState().reviewChanges.at(-1)).toMatchObject({ state: 'declined', reason: 'Timers get gamed; raise sampling instead' })
  store.getState().setPersona('jordan')
  const before = dataOf(store.getState())
  expect(store.getState().proposeReviewChange('6-north', 'sampling').ok).toBe(false)
  expect(dataOf(store.getState())).toEqual(before)
  store.getState().setPersona('marcus')
  expect(store.getState().shareReviewerFinding('6-north')).toEqual({ ok: true })
  expect(store.getState().logEvents.at(-1)).toMatchObject({ id: expect.stringMatching(/^log-share-6-north-/), to: ['priya'] })
})
