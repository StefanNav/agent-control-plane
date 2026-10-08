import { buildScenario } from '../../data/scenarios'
import { createSeed } from '../../data/seed'
import { escalationOf, selectDigest, selectExceptionDetail, selectInbox, selectInboxHeader, selectLog } from './selectors'

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

describe('the escalation chain comes from the division (8a)', () => {
  const stale = (now: string) => ({ ...s, now })
  const exc5508 = s.exceptions.find((e) => e.id === 'exc-5508')!

  test('past its deadline it reaches the first person; after 4 h more, the second as well', () => {
    expect(escalationOf(stale('2026-12-08T10:45:00'), exc5508)).toEqual([])
    expect(escalationOf(stale('2026-12-08T12:00:00'), exc5508)).toEqual(['priya'])
    expect(escalationOf(stale('2026-12-08T14:46:00'), exc5508)).toEqual(['priya', 'dana'])
    expect(selectInbox(stale('2026-12-08T14:46:00'), 'dana').needsMe.map((i) => i.type)).toContain('Monitor stale')
  })

  test('changing "Escalate to" changes who it reaches', () => {
    const changed = stale('2026-12-08T12:00:00')
    changed.divisions = changed.divisions.map((d) => (d.id === 'medications' ? { ...d, escalation: { first: 'dana', then: 'priya', afterHours: 4 } } : d))
    expect(escalationOf(changed, exc5508)).toEqual(['dana'])
    expect(selectInbox(changed, 'priya').needsMe.map((i) => i.type)).not.toContain('Monitor stale')
    expect(selectExceptionDetail(changed, 'exc-5508', 'marcus')!.escalationLine).toBe('Escalated to Dana at 10:46')
  })

  test('incidents and hand-offs with a link never escalate', () => {
    const incident = s.exceptions.find((e) => e.kind === 'incident')!
    expect(escalationOf(stale('2026-12-09T12:00:00'), incident)).toEqual([])
    expect(escalationOf(stale('2026-12-09T12:00:00'), { ...exc5508, link: { label: 'Open', to: '/' } })).toEqual([])
  })
})

test('a snoozed item leaves until its time', () => {
  const snoozed = { ...s, exceptions: s.exceptions.map((e) => (e.id === 'exc-5512' ? { ...e, snoozedUntil: '2026-12-08T10:52:00' } : e)) }
  expect(selectInbox(snoozed, 'marcus').needsMe).toHaveLength(3)
  expect(selectInbox({ ...snoozed, now: '2026-12-08T10:53:00' }, 'marcus').needsMe).toHaveLength(4)
})

test('the detail of the edit-rate item reads like 5a', () => {
  const d = selectExceptionDetail(s, 'exc-5512', 'marcus')!
  expect(d.meta).toBe('EXC-5512 · MR-12 v1 · raised 07:15 · due today 15:00 · Marcus')
  expect(d.escalationLine).toBe('Not handled by 15:00 → goes to Priya')
  expect(d.breakdown).toHaveLength(3)
  expect(selectExceptionDetail(s, 'nope', 'marcus')).toBeNull()
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

test('the 07:00 digest (5c): what can wait for the morning email, what changed, what stays in the log', () => {
  const digest = selectDigest(createSeed(), 'marcus')
  expect(digest).toMatchObject({
    from: 'AIMS · Lakeshore Health',
    to: 'Marcus',
    subject: 'Medications · daily digest · Tue 08 Dec',
    title: '2 things need you today',
    sub: '17 of 20 agents within scope overnight. Nothing paged you.',
    logTotal: 41,
  })
  expect(digest.needs).toEqual([
    { id: 'exc-5512', status: 'warn', label: 'Edit rate rising', text: 'Renal Dosing Agent · edit rate 19.2 % against 10 %', due: 'Due today 15:00', link: 'Open' },
    { id: 'exc-5514', status: 'normal', label: 'Question from Sam', text: 'Move pyxis.dispense.read to the v2 endpoint?', due: 'Due tomorrow', link: 'Answer' },
  ])
  expect(digest.changes.map((c) => c.text)).toEqual([
    'Allergy Recon Agent v1.2.1 deployed by Sam. Re-validation passed on 200 replayed cases.',
    'HS-04 v2 published: dose checks now read strengths from the formulary table.',
  ])
})

test('the log lists every event newest first, with the agent named', () => {
  const s = createSeed()
  const withTune = { ...s, logEvents: [...s.logEvents, { id: 'log-tune-42', at: '2026-12-08T09:52:00', agentId: 'renal-dosing', text: 'Raise the MR-12 threshold', sub: 'Requested by Marcus' }] }
  const rows = selectLog(withTune)
  expect(rows).toHaveLength(42)
  expect(rows[0]).toEqual({ id: 'log-tune-42', time: '09:52', text: 'Raise the MR-12 threshold', sub: 'Renal Dosing Agent · Requested by Marcus' })
  expect(rows[1]!.time).toBe('09:50')
})

describe('what the detail says depends on the item and on who is looking', () => {
  test('the escalation notice is for the sponsor it reached; the owner sees where it went', () => {
    const at12 = buildScenario('stale-escalated')
    const priya = selectExceptionDetail(at12, 'exc-5508', 'priya')!
    expect(priya.escalatedToViewer).toBe(true)
    expect(priya.escalationNotice).toMatch(/^Marcus is the owner/)
    const marcus = selectExceptionDetail(at12, 'exc-5508', 'marcus')!
    expect(marcus.escalatedToViewer).toBe(false)
    expect(marcus.escalationNotice).toBeNull()
    expect(marcus.escalationLine).toBe('Escalated to Priya at 10:46')
  })

  test('the deadline line never promises a time that has passed', () => {
    const at12 = buildScenario('stale-escalated')
    expect(selectExceptionDetail(at12, 'exc-5530', 'marcus')!.escalationLine).toBe('Claimed by Marcus at 09:55')
    expect(selectExceptionDetail(s, 'exc-5514', 'marcus')!.escalationLine).toBe('Not handled by tomorrow 17:00 → goes to Priya')
  })

  test('a closed item says who closed it, when and how, and offers no line', () => {
    const resolved = selectExceptionDetail(s, 'exc-5521', 'marcus')!
    expect(resolved.closed).toEqual({ lead: 'Resolved by Marcus at 08:12.', text: '2 drafts signed as is · Ana R. · allergy kept on list' })
    expect(resolved.escalationLine).toBeNull()
    expect(resolved.meta).toBe('EXC-5521 · HS-07 v1 · raised 07:58 · due 08:45 · closed 08:12 · Marcus')
    const dismissed = {
      ...s,
      exceptions: s.exceptions.map((e) =>
        e.id === 'exc-5512' ? { ...e, state: 'dismissed' as const, closedAt: '2026-12-08T09:52:00', closedBy: 'marcus', dismissReason: 'F-112 explains it.' } : e,
      ),
    }
    expect(selectExceptionDetail(dismissed, 'exc-5512', 'marcus')!.closed).toEqual({ lead: 'Dismissed by Marcus at 09:52.', text: 'F-112 explains it.' })
  })

  test('a critical incident points to its incident record and has no deadline line', () => {
    const d = selectExceptionDetail(s, 'exc-5501', 'dana')!
    expect(d.kind).toBe('incident')
    expect(d.incidentId).toBe('inc-0029')
    expect(d.escalationLine).toBeNull()
  })
})
