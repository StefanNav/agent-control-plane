import { createSeed } from '../data/seed'
import { selectInbox } from '../features/inbox/selectors'
import { applyFlag, reasonFromEdit } from './feedback'
import { createDemoStore, dataOf } from './index'
import { createMemoryStorage } from './storage'

const AT = '2026-12-08T09:52:00'
const fresh = () => createDemoStore(createMemoryStorage())

test('reasonFromEdit picks the reason from the pharmacist’s edit (10a)', () => {
  expect(reasonFromEdit({ field: 'frequency' })).toBe('frequency')
  expect(reasonFromEdit({ field: 'dose' })).toBe('dose')
  expect(reasonFromEdit(undefined)).toBe('other')
})

test('Ana flags DR-88412 in one action: FB-2291 reaches Marcus with her edit attached', () => {
  const s = applyFlag(createSeed(), { draftId: 'DR-88412', reason: 'frequency' }, 'ana', AT)
  const flag = s.flags.at(-1)!
  expect(flag).toMatchObject({
    code: 'FB-2291',
    draftId: 'DR-88412',
    agentId: 'med-rec',
    byId: 'ana',
    byName: 'Ana R.',
    unit: '7 West',
    reason: 'frequency',
    title: 'Frequency wrong · Metoprolol tartrate 25 mg',
    edit: { med: 'Metoprolol tartrate 25 mg', field: 'frequency', from: 'every 12 h + BID', to: 'BID' },
    status: 'sent',
  })
  const item = s.exceptions.find((e) => e.id === flag.exceptionId)!
  expect(item).toMatchObject({
    kind: 'flag',
    status: 'review',
    type: 'Flag from Epic',
    ruleTag: 'FB-2291',
    ownerId: 'marcus',
    agentId: 'med-rec',
    reason: 'Ana R. flagged DR-88412: Frequency wrong · Metoprolol tartrate 25 mg · every 12 h + BID → BID',
    action: 'answer Ana R.’s flag',
    state: 'new',
  })
  expect(selectInbox(s, 'marcus').needsMe).toHaveLength(5)
})

test('with a note, the flag’s title is the note', () => {
  const s = applyFlag(createSeed(), { draftId: 'DR-88412', reason: 'frequency', note: 'Frequency split into two lines' }, 'ana', AT)
  expect(s.flags.at(-1)).toMatchObject({ title: 'Frequency split into two lines', note: 'Frequency split into two lines' })
})

describe('flagDraft and answerFlag', () => {
  test('Ana flags once; a second flag, an unknown draft, or anyone else is refused', () => {
    const store = fresh()
    store.getState().setPersona('marcus')
    const before = dataOf(store.getState())
    expect(store.getState().flagDraft('DR-88412', { reason: 'frequency' }).ok).toBe(false)
    expect(dataOf(store.getState())).toEqual(before)
    store.getState().setPersona('ana')
    expect(store.getState().flagDraft('DR-00000', { reason: 'frequency' })).toEqual({ ok: false, reason: 'Draft not found' })
    expect(store.getState().flagDraft('DR-88412', { reason: 'frequency' })).toEqual({ ok: true })
    expect(store.getState().audit.at(-1)).toMatchObject({ who: 'ana', action: 'Flagged from Epic', target: 'FB-2291' })
    expect(store.getState().flagDraft('DR-88412', { reason: 'dose' })).toEqual({ ok: false, reason: 'You already flagged this draft' })
  })

  test('Marcus answers: a fix in progress, not a defect, or a reply', () => {
    const store = fresh()
    store.getState().setPersona('ana')
    store.getState().flagDraft('DR-88412', { reason: 'frequency' })
    const id = store.getState().flags.at(-1)!.exceptionId!
    store.getState().setPersona('marcus')
    expect(store.getState().answerFlag(id, { kind: 'inProgress', text: ' ' })).toEqual({ ok: false, reason: 'Write a note for Ana R.' })
    expect(store.getState().answerFlag(id, { kind: 'notDefect', text: '' })).toEqual({ ok: false, reason: 'Say why it isn’t a defect' })
    expect(store.getState().answerFlag(id, { kind: 'reply', text: 'Looking at it today.' })).toEqual({ ok: true })
    expect(store.getState().flags.at(-1)!.reply).toEqual({ by: 'marcus', text: 'Looking at it today.', at: AT })
    expect(store.getState().exceptions.find((e) => e.id === id)!.state).toBe('new')
    expect(store.getState().answerFlag(id, { kind: 'inProgress', text: 'Sam is changing how the frequency is read' })).toEqual({ ok: true })
    expect(store.getState().flags.at(-1)).toMatchObject({ status: 'inProgress', progress: 'Sam is changing how the frequency is read' })
    expect(store.getState().exceptions.find((e) => e.id === id)).toMatchObject({ state: 'resolved', outcome: 'Working on a fix', closedBy: 'marcus' })
  })

  test('not a defect closes the item with the reason', () => {
    const store = fresh()
    store.getState().setPersona('ana')
    store.getState().flagDraft('DR-88412', { reason: 'duplicate' })
    const id = store.getState().flags.at(-1)!.exceptionId!
    store.getState().setPersona('marcus')
    expect(store.getState().answerFlag(id, { kind: 'notDefect', text: 'Two fills, both listed and marked.' })).toEqual({ ok: true })
    expect(store.getState().flags.at(-1)).toMatchObject({ status: 'notDefect', notDefect: 'Two fills, both listed and marked.' })
    expect(store.getState().exceptions.find((e) => e.id === id)).toMatchObject({ state: 'resolved', outcome: 'Not a defect' })
  })
})
