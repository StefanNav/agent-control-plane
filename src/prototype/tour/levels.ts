/**
 * A clip's levels are one digit (0–9) per window this long: its loudness, for the bar's voice meter.
 * `scripts/tour-tools.mjs` measures them into the manifest at the same rate.
 */
export const LEVEL_WINDOW_MS = 50

/** The clip's level (0–9) `ms` into it: its window's digit; 0 before the clip, past it or with no levels. */
export function levelAt(levels: string, ms: number): number {
  if (!(ms >= 0)) return 0
  const digit = levels.charCodeAt(Math.floor(ms / LEVEL_WINDOW_MS)) - 48
  return digit >= 0 && digit <= 9 ? digit : 0
}

/**
 * Is the voice partway through a clip `clipMs` long? A stopped voice reads 0, and a clip that ran to
 * its end holds its full length (while the line's after-actions run), so neither is.
 */
export function inClip(ms: number, clipMs: number): boolean {
  return ms > 0 && ms < clipMs
}
