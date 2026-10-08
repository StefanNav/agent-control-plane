import { trendPoints } from './trend'

test('seven points ending exactly at end, clamped to 75–100', () => {
  const pts = trendPoints(0, { end: 91, drift: 0.2 })
  expect(pts).toHaveLength(7)
  expect(pts[6]).toBe(91)
  for (const v of pts) {
    expect(v).toBeGreaterThanOrEqual(75)
    expect(v).toBeLessThanOrEqual(100)
  }
})

test('a negative drift draws a decline', () => {
  const pts = trendPoints(1, { end: 78, drift: -1.8 })
  expect(pts[6]).toBe(78)
  expect(pts[0]!).toBeGreaterThan(pts[6]!)
})

test('is deterministic', () => {
  expect(trendPoints(3, { end: 92, drift: 0 })).toEqual(trendPoints(3, { end: 92, drift: 0 }))
})
