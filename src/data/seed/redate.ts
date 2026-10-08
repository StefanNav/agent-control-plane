import { addDays } from '../../lib/clock'

/**
 * Ruling R1 (Phase 6): the v2 frames (E9–E11) are drawn in March 2027. The prototype keeps one
 * clock, so each frame's "today" becomes the day it is shown, and its other dates move with it.
 * The seed writes the frame's own date and shifts it, so every value stays traceable to its frame.
 */
export const fromMarch = (iso: string, days: number) => addDays(iso, days)

/** 10a (17 Mar → 08 Dec), 9a (24 Mar → 15 Dec) and 10b (26 Mar → 17 Dec). */
export const E10_SHIFT = -99
/** 9b, 11a and 11b (24 Mar → 08 Dec). */
export const E11_SHIFT = -106
