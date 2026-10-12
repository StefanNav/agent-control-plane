import symbol from '../../../reference/attune-motion-kit/assets/attune-symbol.svg?raw'
import {
  PEBBLES,
  SETTLE_S,
  WELCOME_S,
  WELCOME_TOTAL_S,
  isDeep,
  pebblePath,
  quietPose,
  restPose,
  transformOf,
  welcomeFrame,
  welcomePose,
  type Pose,
} from './geometry'

const numbers = (text: string) => (text.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)
const each = (fn: (i: number) => void) => [0, 1, 2, 3].forEach(fn)

function expectPose(actual: Pose, expected: Pose, digits = 9) {
  actual.forEach((value, k) => expect(value).toBeCloseTo(expected[k]!, digits))
}

/** The kit's static symbol: each pebble a `<g transform="translate(x y)">` around one path. */
const kitPebbles = [
  ...symbol.matchAll(/<g transform="translate\(([^)]+)\)"><path fill="([^"]+)" d="([^"]+)"/g),
].map(([, translate, fill, d]) => ({ at: numbers(translate!), fill: fill!, d: d! }))

test('the still mark matches the kit’s symbol', () => {
  expect(kitPebbles).toHaveLength(PEBBLES)
  each((i) => {
    const ours = numbers(pebblePath(i, 0, 1))
    const kit = numbers(kitPebbles[i]!.d)
    expect(ours).toHaveLength(kit.length)
    ours.forEach((value, k) => expect(value).toBeCloseTo(kit[k]!, 9))
    expect(restPose(i).slice(0, 2)).toEqual(kitPebbles[i]!.at)
  })
})

test('pebbles 0 and 3 are the deep ones, as in the kit', () => {
  const deep = kitPebbles.map((p) => p.fill === kitPebbles[0]!.fill)
  expect([0, 1, 2, 3].map(isDeep)).toEqual(deep)
  expect(deep).toEqual([true, false, false, true])
})

test('the welcome starts at rest', () => {
  const frame = welcomeFrame(0)
  each((i) => expectPose(frame[i]!, restPose(i)))
})

test('mid-dance the pebbles travel', () => {
  const frame = welcomeFrame(1.1)
  const travel = [0, 1, 2, 3].map((i) => Math.abs(frame[i]![0] - restPose(i)[0]))
  expect(Math.max(...travel)).toBeGreaterThan(10)
})

test('the dance hands over to the settle without a jump', () => {
  each((i) => expectPose(welcomePose(WELCOME_S, i), quietPose(0, i)))
  const before = welcomeFrame(WELCOME_S - 1e-6)
  const after = welcomeFrame(WELCOME_S + 1e-6)
  each((i) => {
    expectPose(before[i]!, welcomePose(WELCOME_S, i), 3)
    expectPose(after[i]!, welcomePose(WELCOME_S, i), 3)
  })
})

test('the settle reaches rest', () => {
  expect(WELCOME_TOTAL_S).toBeCloseTo(WELCOME_S + SETTLE_S, 9)
  const frame = welcomeFrame(WELCOME_TOTAL_S)
  each((i) => expectPose(frame[i]!, restPose(i)))
  each((i) => expectPose(welcomeFrame(60)[i]!, restPose(i)))
})

test('transformOf writes a pose as an SVG transform', () => {
  expect(transformOf(restPose(0))).toBe('translate(-27.6 -25.35) rotate(0) scale(1)')
})
