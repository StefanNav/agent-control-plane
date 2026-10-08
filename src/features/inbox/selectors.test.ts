import { createSeed } from '../../data/seed'
import { selectExceptionDetail, selectInbox, selectInboxHeader } from './selectors'

const s = createSeed()

test('Marcus needs to act on four items, by deadline; two wait on others', () => {
  const inbox = selectInbox(s, 'marcus')
  expect(inbox.needsMe.map((i) => [i.type, i.due])).toEqual([
    ['Monitor stale', 'Due 10:46'],
    ['Review: 3 drafts', 'Due 11:00'],
    ['Edit rate rising', 'Due 15:00'],
    ['Question', 'Due tomorrow'],
  ])
  expect(inbox.needsMe[0]).toMatchObject({ source: 'Formulary Swap Agent · MON-02 v1', action: 'Action: check the feed with Sam' })
  expect(inbox.needsMe[3]!.source).toBe('Sam · Med Rec Agent')
  expect(inbox.waiting).toHaveLength(2)
  expect(inbox.logTotal).toBe(41)
})

test('past its deadline and unclaimed, an item escalates to the sponsor', () => {
  const late = { ...s, now: '2026-12-08T12:00:00' }
  late.exceptions = late.exceptions.map((e) => (e.id === 'exc-5530' ? { ...e, claimedAt: '2026-12-08T09:55:00', state: 'claimed' as const } : e))
  const priya = selectInbox(late, 'priya')
  expect(priya.needsMe[0]).toMatchObject({ type: 'Monitor stale', due: '1 h 14 min late', escalated: true, source: 'Formulary Swap Agent · escalated' })
  expect(priya.needsMe).toHaveLength(3)
  expect(priya.waiting).toHaveLength(1)
})

test('a snoozed item leaves until its time', () => {
  const snoozed = { ...s, exceptions: s.exceptions.map((e) => (e.id === 'exc-5512' ? { ...e, snoozedUntil: '2026-12-08T10:52:00' } : e)) }
  expect(selectInbox(snoozed, 'marcus').needsMe).toHaveLength(3)
  expect(selectInbox({ ...snoozed, now: '2026-12-08T10:53:00' }, 'marcus').needsMe).toHaveLength(4)
})

test('the detail of the edit-rate item reads like 5a', () => {
  const d = selectExceptionDetail(s, 'exc-5512')!
  expect(d.meta).toBe('EXC-5512 · MR-12 v1 · raised 07:15 · due today 15:00 · Marcus')
  expect(d.escalationLine).toBe('Not handled by 15:00 → goes to Priya')
  expect(d.breakdown).toHaveLength(3)
  expect(selectExceptionDetail(s, 'nope')).toBeNull()
})

test('due within two hours (or late) is emphasised; later deadlines are not', () => {
  const { needsMe } = selectInbox(createSeed(), 'marcus')
  expect(needsMe.map((i) => [i.due, i.dueSoon])).toEqual([
    ['Due 10:46', true],
    ['Due 11:00', true],
    ['Due 15:00', false],
    ['Due tomorrow', false],
  ])
})

test('the inbox header names the persona and their division', () => {
  const s = createSeed()
  expect(selectInboxHeader(s, 'marcus')).toEqual({ status: 'Marcus · Medications', divisionId: 'medications' })
  expect(selectInboxHeader(s, 'dana')).toEqual({ status: 'Dana · All divisions', divisionId: undefined })
})
