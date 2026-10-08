import { createSeed } from '../seed'
import { advanceClock } from './clock'

const privilege = (s: ReturnType<typeof createSeed>, code: string) =>
  s.privileges.filter((p) => p.code === code).at(-1)!
const activity = (s: ReturnType<typeof createSeed>, id: string) => s.activities.find((a) => a.id === id)!

test('Duplicate Rx lapses to Shadow when the 14-day grace ends on 15 Dec (8a), and only once', () => {
  const s = advanceClock(createSeed(), '2026-12-15T09:52:00')
  expect(privilege(s, 'PRV-0098')).toMatchObject({ state: 'lapsed', movedBy: 'ORG-LAPSE-01', trigger: 'Review date passed 01 Dec' })
  expect(activity(s, 'duplicate-rx').level).toBe('shadow')
  expect(s.agents.find((a) => a.id === 'duplicate-rx')!.level).toBe('shadow')
  const overdue = s.exceptions.filter((e) => e.type === 'Review overdue' && e.ruleTag === 'PRV-0098')

  const later = advanceClock(structuredClone(s), '2026-12-17T09:52:00')
  expect(later.privileges).toEqual(s.privileges)
  expect(later.exceptions.filter((e) => e.type === 'Review overdue' && e.ruleTag === 'PRV-0098')).toEqual(overdue)
})

test('before the grace period ends, the privilege is still only due', () => {
  const s = advanceClock(createSeed(), '2026-12-14T23:59:00')
  expect(privilege(s, 'PRV-0098').state).toBe('due')
  expect(activity(s, 'duplicate-rx').level).toBe('draft')
})

test('the overdue review is due when the division’s grace period closes', () => {
  const s = createSeed()
  s.divisions.find((d) => d.id === 'medications')!.graceDays = 7
  const p = s.privileges.find((x) => x.code === 'PRV-0131')!
  p.reviewDate = '2026-12-09T00:00:00'
  advanceClock(s, '2026-12-09T09:52:00')
  const raised = s.exceptions.find((e) => e.type === 'Review overdue' && e.ruleTag === 'PRV-0131')!
  expect(raised.deadline).toBe('2026-12-16T17:00:00')
})
