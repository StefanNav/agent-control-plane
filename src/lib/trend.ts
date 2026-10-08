import type { Trend } from '../data/types'

const frac = (x: number) => x - Math.floor(x)

/** The design's per-point jitter (DivisionView / CountersignCore `noise`). */
function noise(i: number, j: number): number {
  return (frac(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) - 0.5) * 1.2
}

/**
 * Seven daily values for an agent's sparkline, reproducing the design: a line drifting
 * by `drift` per day to `end`, with small deterministic jitter, clamped to 75–100.
 */
export function trendPoints(index: number, { end, drift }: Trend): number[] {
  return Array.from({ length: 7 }, (_, j) => {
    const v = end - drift * (6 - j) + (j === 6 ? 0 : noise(index, j))
    return Math.max(75, Math.min(100, v))
  })
}
