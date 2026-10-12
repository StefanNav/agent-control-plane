/**
 * The Attune mark's geometry, ported from the motion kit (`reference/attune-motion-kit/attune-motion.js`):
 * four pebbles, each a four-curve path that blends from a soft pebble to a circle, and the kit's rest,
 * quiet and welcome poses. Only what the landing's welcome uses; the kit's other motions stay there.
 * The arithmetic keeps the kit's order, so the still mark matches its symbol to the digit.
 */

/** A pebble's pose: where it sits, its turn and size, how round it is (0 pebble, 1 circle), its stretch. */
export type Pose = readonly [
  x: number,
  y: number,
  rotation: number,
  scale: number,
  circle: number,
  stretch: number,
]

export const PEBBLES = 4
/** The welcome dances, then settles into the still mark (the kit's 2250 ms and 520 ms), in seconds. */
export const WELCOME_S = 2.25
export const SETTLE_S = 0.52
export const WELCOME_TOTAL_S = WELCOME_S + SETTLE_S
/** The most one frame may advance, so a long gap (a hidden tab) never skips the dance. */
export const MAX_STEP_S = 0.05

const TAU = Math.PI * 2
/** Each pebble's centre and radii at rest, in the mark's 200-unit space (centre 0 0). */
const HOME = [
  [-27.6, -25.35],
  [35.55, -31.05],
  [-36.75, 30.45],
  [27.75, 24.75],
] as const
const RADII = [
  [35.1, 30.6],
  [25.35, 21.3],
  [25.35, 22.2],
  [34.95, 31.2],
] as const

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => {
  const c = clamp(x)
  return c * c * (3 - 2 * c)
}
const mix = (a: Pose, b: Pose, t: number): Pose =>
  a.map((value, k) => value + (b[k]! - value) * t) as unknown as Pose

/** The top-left and bottom-right pebbles are the deep colour; the other two the soft one. */
export const isDeep = (i: number) => i === 0 || i === 3

export function restPose(i: number): Pose {
  const [x, y] = HOME[i]!
  return [x, y, 0, 1, 0, 1]
}

/** Pebble `i` as a path around its own centre: `circle` 0 is its soft pebble, 1 a circle of equal area. */
export function pebblePath(i: number, circle: number, stretch: number): string {
  const [ra, rb] = RADII[i]!
  const r = Math.sqrt(ra * rb)
  const c = clamp(circle)
  const a = (ra + (r - ra) * c) * stretch
  const b = (rb + (r - rb) * c) / stretch
  const k = 0.68 + (0.55228475 - 0.68) * c
  return `M0 ${-b}C${k * a} ${-b} ${a} ${-k * b} ${a} 0C${a} ${k * b} ${k * a} ${b} 0 ${b}C${-k * a} ${b} ${-a} ${k * b} ${-a} 0C${-a} ${-k * b} ${-k * a} ${-b} 0 ${-b}Z`
}

export function transformOf([x, y, rotation, scale]: Pose): string {
  return `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`
}

/** The kit's quiet breath: a small staggered lift, `t` seconds in. */
export function quietPose(t: number, i: number): Pose {
  const p = (1 + Math.sin(t * 2.15 - (i * Math.PI) / 2)) / 2
  return [HOME[i]![0], HOME[i]![1] - 1.4 * p, 0, 0.965 + 0.035 * p, 0.12 + 0.45 * p, 1]
}

/** The kit's "First hello": the two pairs dance, then ease into the quiet breath by `WELCOME_S`. */
export function welcomePose(t: number, i: number): Pose {
  if (t >= WELCOME_S) return quietPose(0, i)
  const u = Math.max(0, t) / WELCOME_S
  const pair = i < 2 ? 0 : 1
  const theta = TAU * u + (i % 2) * Math.PI
  const dance: Pose = [
    (pair - 0.5) * 87 + 22 * Math.cos(theta),
    25 * Math.sin(theta) - 10 * Math.sin(Math.PI * u),
    22 * Math.sin(theta),
    0.72,
    1,
    1 + 0.12 * Math.sin(2 * theta),
  ]
  return mix(mix(restPose(i), dance, ease(u / 0.18)), quietPose(0, i), ease((u - 0.68) / 0.32))
}

/** The kit's settle on completion: from `from` back to rest, the pebbles 25 ms apart, `t` seconds in. */
export function settlePose(from: Pose, t: number, i: number): Pose {
  return mix(from, restPose(i), ease((t - i * 0.025) / 0.42))
}

/** The whole welcome, `elapsed` seconds in: the dance, then the settle; at rest from `WELCOME_TOTAL_S`. */
export function welcomeFrame(elapsed: number): Pose[] {
  return [0, 1, 2, 3].map((i) =>
    elapsed < WELCOME_S
      ? welcomePose(elapsed, i)
      : settlePose(welcomePose(WELCOME_S, i), elapsed - WELCOME_S, i),
  )
}
