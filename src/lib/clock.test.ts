import {
  addMinutes,
  tomorrowAt,
  DEMO_NOW,
  formatAge,
  formatAgo,
  formatClock,
  formatClockSeconds,
  formatDate,
  formatDay,
  formatDue,
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

test.each([
  ['2026-12-08T08:05:00', '1 h 47'],
  ['2026-12-08T09:42:00', '10 min'],
  ['2026-12-08T06:46:00', '3 h 06'],
  ['2026-12-01T06:00:00', '7 d'],
])('formatAge(%s) → %s', (from, expected) => {
  expect(formatAge(from, NOW)).toBe(expected)
})

test.each([
  ['2026-12-08T10:46:00', 'Due 10:46'],
  ['2026-12-09T17:00:00', 'Due tomorrow'],
  ['2026-12-11T17:00:00', 'Due Friday'],
  ['2026-12-15T17:00:00', 'Due 15 Dec'],
  ['2026-12-08T09:40:00', '12 min late'],
])('formatDue(%s) → %s', (deadline, expected) => {
  expect(formatDue(deadline, NOW)).toBe(expected)
})

test('formatDue reports lateness in hours and minutes', () => {
  expect(formatDue('2026-12-08T10:46:00', '2026-12-08T12:00:00')).toBe('1 h 14 min late')
})

test('addMinutes and tomorrowAt keep local, timezone-free ISO strings', () => {
  expect(addMinutes('2026-12-08T09:52:00', 60)).toBe('2026-12-08T10:52:00')
  expect(addMinutes('2026-12-31T23:30:00', 45)).toBe('2027-01-01T00:15:00')
  expect(tomorrowAt('2026-12-08T09:52:00', '07:00')).toBe('2026-12-09T07:00:00')
  expect(tomorrowAt('2026-12-31T23:59:00', '07:00')).toBe('2027-01-01T07:00:00')
})

test('addDays counts calendar days, across a daylight-saving change', async () => {
  const { addDays } = await import('./clock')
  expect(addDays('2026-10-15T00:00:00', 20)).toBe('2026-11-04T00:00:00')
  expect(addDays('2026-11-06T09:52:00', 91)).toBe('2027-02-05T09:52:00')
  expect(addDays('2026-12-08T09:52:00', -1)).toBe('2026-12-07T09:52:00')
})

test('dayGap counts calendar days between two dates, ignoring the time (Phase 7)', async () => {
  const { dayGap } = await import('./clock')
  expect(dayGap('2026-12-08T09:52:00', '2026-12-29T00:00:00')).toBe(21)
  expect(dayGap('2026-11-24T00:00:00', '2026-12-08T09:52:00')).toBe(14)
  expect(dayGap('2026-09-09T10:00:00', '2026-12-08T09:52:00')).toBe(90)
  expect(dayGap('2026-12-08T09:52:00', '2026-12-08T23:00:00')).toBe(0)
})
