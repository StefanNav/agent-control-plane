import { tourMinutes } from './tourMinutes'

const at = (minutes: number, seconds: number) => (minutes * 60 + seconds) * 1000

test('rounds the tour’s length to whole minutes', () => {
  expect(tourMinutes(at(7, 2))).toBe(7)
  expect(tourMinutes(at(7, 15))).toBe(7)
  expect(tourMinutes(at(7, 30))).toBe(8)
  expect(tourMinutes(at(12, 10))).toBe(12)
})

test('never says 0 min', () => {
  expect(tourMinutes(at(0, 20))).toBe(1)
  expect(tourMinutes(0)).toBe(1)
})
