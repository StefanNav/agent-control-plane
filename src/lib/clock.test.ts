import {
  DEMO_NOW,
  formatAgo,
  formatClock,
  formatClockSeconds,
  formatDate,
  formatDay,
  formatMs,
  formatRelative,
  minutesBetween,
} from './clock'

const NOW = '2026-12-08T09:52:00'

test('the demo clock is Tue 08 Dec 2026, 09:52', () => {
  expect(DEMO_NOW).toBe(NOW)
  expect(formatClock(NOW)).toBe('09:52')
  expect(formatDay(NOW)).toBe('Tue 08 Dec')
})

test('clock formats', () => {
  expect(formatClockSeconds('2026-12-08T09:42:17')).toBe('09:42:17')
  expect(formatMs('2026-12-08T09:38:04.512')).toBe('09:38:04.512')
  expect(formatDate('2027-01-05T00:00:00')).toBe('05 Jan')
})

test.each([
  ['2026-12-08T10:40:00', 'in 48 min'],
  ['2026-12-08T12:10:00', 'in 2 h 18 min'],
  ['2026-12-08T11:52:00', 'in 2 h'],
  ['2026-12-08T09:40:00', 'Overdue 12 min'],
  ['2026-12-08T08:05:00', 'Overdue 1 h 47 min'],
  ['2026-12-14T09:52:00', 'in 6 days'],
  ['2026-12-09T09:52:00', 'in 1 day'],
  ['2026-12-01T09:52:00', 'Overdue 7 days'],
])('formatRelative(%s) → %s', (target, expected) => {
  expect(formatRelative(target, NOW)).toBe(expected)
})

test('formatAgo', () => {
  expect(formatAgo('2026-12-08T07:38:00', NOW)).toBe('2 h 14 min ago')
  expect(formatAgo('2026-12-08T09:40:00', NOW)).toBe('12 min ago')
  expect(formatAgo('2026-12-05T09:52:00', NOW)).toBe('3 days ago')
})

test('minutesBetween is b − a in whole minutes', () => {
  expect(minutesBetween('2026-12-08T09:40:00', NOW)).toBe(12)
  expect(minutesBetween(NOW, '2026-12-08T09:40:00')).toBe(-12)
})
