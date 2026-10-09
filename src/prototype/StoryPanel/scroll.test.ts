import { scrollDelta } from './scroll'

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  height,
})
// The panel at 1440 × 900: bottom-right, 360 wide, about 250 tall.
const panel = rect(1056, 626, 360, 250)
const H = 900

test('a target in view and clear of the panel stays put', () => {
  expect(scrollDelta(rect(24, 200, 760, 300), panel, H)).toBe(0)
})

test('a target the panel would cover scrolls until its bottom clears the panel', () => {
  // Dana step 4: the caller panel at x 1020–1400, y 265–826.
  expect(scrollDelta(rect(1020, 265, 380, 561), panel, H)).toBe(826 - (626 - 16))
})

test('a target below the fold scrolls up into view', () => {
  expect(scrollDelta(rect(24, 1200, 760, 200), panel, H)).toBe(1400 - (H - 16))
})

test('a target above the viewport scrolls down to it', () => {
  expect(scrollDelta(rect(24, -300, 760, 200), panel, H)).toBe(-300 - 16)
})

test('a target too tall to fit is left alone while its top shows, else brought to the top', () => {
  expect(scrollDelta(rect(24, 140, 1392, 1400), panel, H)).toBe(0)
  expect(scrollDelta(rect(24, 1300, 1392, 1400), panel, H)).toBe(1300 - 16)
})

test('without a panel only the viewport counts', () => {
  expect(scrollDelta(rect(1020, 265, 380, 561), null, H)).toBe(0)
})
