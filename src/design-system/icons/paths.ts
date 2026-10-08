/** Icon geometry, verbatim from docs/design-handoff.md → "Icons" and reference/cs-build.js. */
export type IconName =
  | 'ring'
  | 'diamond'
  | 'triangle'
  | 'stale'
  | 'shadow'
  | 'paused'
  | 'check'
  | 'lock'
  | 'chevron'

export type IconShape =
  | { kind: 'path'; d: string; fill?: boolean; strokeWidth?: number; dash?: string; round?: boolean }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }

export const RING = 'M6 1.75a4.25 4.25 0 1 1 0 8.5a4.25 4.25 0 1 1 0-8.5Z'

export const ICONS: Record<IconName, { viewBox: number; shapes: IconShape[] }> = {
  ring: { viewBox: 12, shapes: [{ kind: 'path', d: RING, strokeWidth: 1.5 }] },
  diamond: { viewBox: 12, shapes: [{ kind: 'path', d: 'M6 0.9L11.1 6L6 11.1L0.9 6Z', fill: true }] },
  triangle: { viewBox: 12, shapes: [{ kind: 'path', d: 'M6 1.2L11.4 10.6H0.6Z', fill: true }] },
  stale: { viewBox: 12, shapes: [{ kind: 'path', d: RING, strokeWidth: 1.5, dash: '2.2 1.75' }] },
  shadow: {
    viewBox: 12,
    shapes: [
      { kind: 'path', d: RING, strokeWidth: 1.5 },
      { kind: 'path', d: 'M6 1.75a4.25 4.25 0 0 0 0 8.5Z', fill: true },
    ],
  },
  paused: { viewBox: 12, shapes: [{ kind: 'path', d: 'M2.6 2h2.4v8H2.6ZM7 2h2.4v8H7Z', fill: true }] },
  check: { viewBox: 12, shapes: [{ kind: 'path', d: 'M2.5 6.2l2.3 2.3 4.7-5', strokeWidth: 1.8, round: true }] },
  lock: {
    viewBox: 12,
    shapes: [
      { kind: 'path', d: 'M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5', strokeWidth: 1.4 },
      { kind: 'rect', x: 2, y: 5.5, width: 8, height: 5.5, rx: 1 },
    ],
  },
  chevron: { viewBox: 10, shapes: [{ kind: 'path', d: 'M2 3.5l3 3 3-3', strokeWidth: 1.5, round: true }] },
}
