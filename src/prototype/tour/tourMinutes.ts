const MS_PER_MINUTE = 60_000

/** The tour's length for the Play button: whole minutes, and never "0 min". */
export function tourMinutes(totalMs: number): number {
  return Math.max(1, Math.round(totalMs / MS_PER_MINUTE))
}
